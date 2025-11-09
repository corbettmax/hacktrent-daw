import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Play, Square, Download, Wand2, Save, Upload, Music2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AudioEngine } from '../lib/audioEngine';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface WavePreset {
  id: string;
  name: string;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
  frequency: number;
  duration: number;
  amplitude: number;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  createdAt: Date;
}

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  parameters?: {
    waveform: string;
    frequency: number;
    duration: number;
    amplitude: number;
    envelope: any;
  };
}

export default function WaveEditor() {
  const { identity } = useInternetIdentity();
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveform, setWaveform] = useState<'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'>('sine');
  const [frequency, setFrequency] = useState(440);
  const [duration, setDuration] = useState(0.5);
  const [amplitude, setAmplitude] = useState(0.5);
  const [envelope, setEnvelope] = useState({
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.2,
  });
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [savedPresets, setSavedPresets] = useState<WavePreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize audio engine
  useEffect(() => {
    const initAudio = async () => {
      const engine = new AudioEngine();
      await engine.initialize();
      audioEngineRef.current = engine;
      await generateSample();
    };

    initAudio();

    // Load AI conversation history from localStorage
    const savedHistory = localStorage.getItem('aiConversationHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setAiMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }
  }, []);

  // Load saved presets
  useEffect(() => {
    if (identity) {
      loadPresets();
    }
  }, [identity]);

  // Generate sample when parameters change
  useEffect(() => {
    generateSample();
  }, [waveform, frequency, duration, amplitude, envelope]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const generateSample = async () => {
    if (!audioEngineRef.current) return;

    try {
      const buffer = await audioEngineRef.current.createSampleFromJSON({
        waveform,
        frequency,
        duration,
        amplitude,
        envelope,
        harmonics: [],
      });

      setCurrentBuffer(buffer);
      drawWaveform(buffer);
    } catch (error) {
      console.error('Failed to generate sample:', error);
      toast.error('Failed to generate sample');
    }
  };

  const drawWaveform = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw waveform
    ctx.strokeStyle = '#3b82f6'; // Blue color
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      const min = Math.min(...Array.from({ length: step }, (_, j) => data[i * step + j] || 0));
      const max = Math.max(...Array.from({ length: step }, (_, j) => data[i * step + j] || 0));
      
      if (i === 0) {
        ctx.moveTo(i, amp - min * amp);
      } else {
        ctx.lineTo(i, amp - min * amp);
      }
      ctx.lineTo(i, amp - max * amp);
    }

    ctx.stroke();
  };

  const handlePlay = () => {
    if (!audioEngineRef.current || !currentBuffer) return;

    if (!isPlaying) {
      audioEngineRef.current.playSound(currentBuffer, 1);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), duration * 1000);
    }
  };

  const handleGenerateAI = async () => {
    if (!currentPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);

    // Add user message to conversation
    const userMessage: AiMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: currentPrompt.trim(),
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);

    try {
      // Call Python API endpoint
      const response = await fetch('/api/generate-synth-params', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: currentPrompt.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Update synth parameters with AI-generated values
      if (data.waveform) setWaveform(data.waveform);
      if (data.frequency) setFrequency(data.frequency);
      if (data.duration) setDuration(data.duration);
      if (data.amplitude) setAmplitude(data.amplitude);
      if (data.envelope) {
        setEnvelope({
          attack: data.envelope.attack ?? envelope.attack,
          decay: data.envelope.decay ?? envelope.decay,
          sustain: data.envelope.sustain ?? envelope.sustain,
          release: data.envelope.release ?? envelope.release,
        });
      }

      // Mark as AI-generated and store the prompt
      setIsAiGenerated(true);
      setAiPrompt(currentPrompt.trim());

      // Add assistant response to conversation
      const assistantMessage: AiMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: `Generated synth parameters for "${currentPrompt.trim()}"`,
        timestamp: new Date(),
        parameters: data,
      };

      const updatedMessages = [...aiMessages, userMessage, assistantMessage];
      setAiMessages(updatedMessages);

      // Save conversation history to localStorage
      localStorage.setItem('aiConversationHistory', JSON.stringify(updatedMessages));

      // Clear input
      setCurrentPrompt('');

      toast.success('AI parameters applied!', {
        description: 'Parameters are now active and will regenerate the sound',
        duration: 5000,
      });
    } catch (error) {
      console.error('Failed to generate AI parameters:', error);
      
      // Add error message to conversation
      const errorMessage: AiMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      const updatedMessages = [...aiMessages, userMessage, errorMessage];
      setAiMessages(updatedMessages);
      localStorage.setItem('aiConversationHistory', JSON.stringify(updatedMessages));

      toast.error('Failed to generate AI parameters', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAiHistory = () => {
    setAiMessages([]);
    localStorage.removeItem('aiConversationHistory');
    toast.success('Conversation history cleared');
  };

  const handleDownload = () => {
    if (!currentBuffer) return;
    toast.info('Download coming soon!', {
      description: 'Export your sample as WAV',
    });
  };

  const loadPresets = async () => {
    if (!identity) return;

    try {
      const user = identity.getPrincipal().toString();
      const response = await fetch(`/pattern/${user}/wave-presets`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setSavedPresets(data.map((preset: any, index: number) => ({
            id: `preset-${index}`,
            name: preset.name || `Preset ${index + 1}`,
            waveform: preset.waveform,
            frequency: preset.frequency,
            duration: preset.duration,
            amplitude: preset.amplitude,
            envelope: preset.envelope,
            createdAt: new Date(preset.createdAt || Date.now()),
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const savePreset = async () => {
    if (!identity) {
      toast.error('Please log in to save presets');
      return;
    }

    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    try {
      const user = identity.getPrincipal().toString();
      const response = await fetch(`/pattern/${user}/wave-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName,
          waveform,
          frequency,
          duration,
          amplitude,
          envelope,
          createdAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success(`Preset "${presetName}" saved!`);
        setPresetName('');
        loadPresets();
      } else {
        toast.error('Failed to save preset');
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      toast.error('Failed to save preset');
    }
  };

  const loadPreset = (preset: WavePreset) => {
    setWaveform(preset.waveform);
    setFrequency(preset.frequency);
    setDuration(preset.duration);
    setAmplitude(preset.amplitude);
    setEnvelope(preset.envelope);
    setIsAiGenerated(false);
    setAiPrompt('');
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleNoteOn = async (noteFrequency: number) => {
    if (!audioEngineRef.current) return;

    try {
      // Generate a sample at the keyboard frequency
      const buffer = await audioEngineRef.current.createSampleFromJSON({
        waveform,
        frequency: noteFrequency,
        duration: 0.5,
        amplitude,
        envelope,
        harmonics: [],
      });

      audioEngineRef.current.playSound(buffer, 1);
    } catch (error) {
      console.error('Failed to play note:', error);
    }
  };

  const handleNoteOff = () => {
    // Note off handled by envelope
  };

  return (
    <div className="space-y-8">
      {/* Title Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Wave Editor
        </h1>
        <p className="text-muted-foreground">
          Create and customize audio samples
        </p>
        {isAiGenerated && aiPrompt && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">AI Generated:</span>
            <span className="text-muted-foreground">"{aiPrompt}"</span>
            <button
              onClick={() => {
                setIsAiGenerated(false);
                setAiPrompt('');
              }}
              className="ml-2 text-muted-foreground hover:text-foreground"
              title="Clear AI indicator"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Preset Manager */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Presets
          </h3>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name..."
              className="flex-1 px-3 py-2 rounded-md bg-background border border-input"
            />
            <Button onClick={savePreset} disabled={!identity}>
              <Save className="mr-2 h-4 w-4" />
              Save Preset
            </Button>
          </div>

          {savedPresets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Saved Presets:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {savedPresets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    onClick={() => loadPreset(preset)}
                    className="justify-start"
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!identity && (
            <p className="text-sm text-muted-foreground">
              Log in to save and load your custom presets
            </p>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handlePlay}
            disabled={isPlaying}
            className="w-32"
          >
            {isPlaying ? (
              <>
                <Square className="mr-2 h-5 w-5" />
                Playing
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Play
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsAiModalOpen(true)}
            className="w-48"
          >
            <Wand2 className="mr-2 h-5 w-5" />
            Generate with AI
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleDownload}
            className="w-32"
          >
            <Download className="mr-2 h-5 w-5" />
            Download
          </Button>
        </div>
      </Card>

      {/* AI Generation Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Sound Generator
            </DialogTitle>
            <DialogDescription>
              Describe the sound you want and AI will generate synth parameters
            </DialogDescription>
          </DialogHeader>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px] max-h-[50vh]">
            {aiMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
                <Sparkles className="h-12 w-12 opacity-50" />
                <div>
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm">Describe the sound you want to create</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs max-w-md">
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">Try:</span> "deep bass kick for techno"
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">Try:</span> "bright aggressive lead for EDM"
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <span className="font-medium">Try:</span> "soft ethereal pad for ambient"
                  </div>
                </div>
              </div>
            ) : (
              <>
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.role === 'assistant' && (
                          <Sparkles className="h-4 w-4 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.parameters && (
                            <div className="mt-2 pt-2 border-t border-border/50 text-xs space-y-1 opacity-80">
                              <div>Waveform: {message.parameters.waveform}</div>
                              <div>Frequency: {message.parameters.frequency} Hz</div>
                              <div>Duration: {message.parameters.duration}s</div>
                              <div>Amplitude: {(message.parameters.amplitude * 100).toFixed(0)}%</div>
                            </div>
                          )}
                          <p className="text-xs opacity-60 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 border-t space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateAI();
                  }
                }}
                placeholder="Describe the sound you want (e.g., 'punchy bass for house music')..."
                className="flex-1 px-4 py-2 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isGenerating}
              />
              <Button
                onClick={handleGenerateAI}
                disabled={isGenerating || !currentPrompt.trim()}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            {aiMessages.length > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{aiMessages.length} message{aiMessages.length !== 1 ? 's' : ''} in history</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAiHistory}
                  className="h-7 text-xs"
                >
                  Clear History
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Waveform Display */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-[200px] rounded-lg bg-black/20"
        />
      </Card>

      {/* Virtual Keyboard */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Virtual Keyboard</h3>
          <VirtualKeyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
          <p className="text-xs text-muted-foreground text-center">
            Click and hold keys to play notes with current wave settings
          </p>
        </div>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Waveform Selection */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Waveform</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['sine', 'square', 'sawtooth', 'triangle', 'noise'] as const).map((type) => (
              <Button
                key={type}
                variant={waveform === type ? 'default' : 'outline'}
                onClick={() => setWaveform(type)}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </Card>

        {/* Basic Parameters */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Parameters</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Frequency: {frequency} Hz
              </label>
              <Slider
                value={[frequency]}
                onValueChange={(v) => setFrequency(v[0])}
                min={20}
                max={2000}
                step={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Duration: {duration.toFixed(2)}s
              </label>
              <Slider
                value={[duration]}
                onValueChange={(v) => setDuration(v[0])}
                min={0.1}
                max={2}
                step={0.1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Amplitude: {(amplitude * 100).toFixed(0)}%
              </label>
              <Slider
                value={[amplitude]}
                onValueChange={(v) => setAmplitude(v[0])}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </div>
        </Card>

        {/* Envelope */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">ADSR Envelope</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Attack: {envelope.attack.toFixed(2)}s
              </label>
              <Slider
                value={[envelope.attack]}
                onValueChange={(v) => setEnvelope({ ...envelope, attack: v[0] })}
                min={0.001}
                max={1}
                step={0.001}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Decay: {envelope.decay.toFixed(2)}s
              </label>
              <Slider
                value={[envelope.decay]}
                onValueChange={(v) => setEnvelope({ ...envelope, decay: v[0] })}
                min={0.001}
                max={1}
                step={0.001}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Sustain: {(envelope.sustain * 100).toFixed(0)}%
              </label>
              <Slider
                value={[envelope.sustain]}
                onValueChange={(v) => setEnvelope({ ...envelope, sustain: v[0] })}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Release: {envelope.release.toFixed(2)}s
              </label>
              <Slider
                value={[envelope.release]}
                onValueChange={(v) => setEnvelope({ ...envelope, release: v[0] })}
                min={0.001}
                max={2}
                step={0.001}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
