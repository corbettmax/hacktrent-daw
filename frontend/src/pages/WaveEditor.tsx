import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { AudioEngine } from '../lib/audioEngine';
import VirtualKeyboard from '../components/VirtualKeyboard';
import WaveformDisplay from '../components/WaveformDisplay';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AICommandPanel from '../components/WaveEditor/AICommandPanel';
import PlaybackControls from '../components/WaveEditor/PlaybackControls';
import WaveformSelector from '../components/WaveEditor/WaveformSelector';
import SynthControls from '../components/WaveEditor/SynthControls';
import SampleEditingPanel from '../components/WaveEditor/SampleEditingPanel';
import ADSREnvelope from '../components/WaveEditor/ADSREnvelope';
import AIHistoryModal from '../components/WaveEditor/AIHistoryModal';

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

interface WaveEditorProps {
  onAddTrackToDrumMachine?: (name: string, buffer: AudioBuffer) => void;
  onSwitchToSequencer?: () => void;
  editingTrackIndex?: number;
  editingTrackBuffer?: AudioBuffer | null;
  onUpdateTrack?: (trackIndex: number, buffer: AudioBuffer) => void;
}

export default function WaveEditor({ 
  onAddTrackToDrumMachine, 
  onSwitchToSequencer,
  editingTrackIndex,
  editingTrackBuffer,
  onUpdateTrack
}: WaveEditorProps = {}) {
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
    } catch (error) {
      console.error('Failed to generate sample:', error);
      toast.error('Failed to generate sample');
    }
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

  // Sample editing functions
  const normalizeBuffer = () => {
    if (!currentBuffer || !audioEngineRef.current) return;

    const data = currentBuffer.getChannelData(0);
    const maxVal = Math.max(...Array.from(data).map(Math.abs));
    
    if (maxVal === 0) return;

    const normalized = data.map(v => v / maxVal);
    const newBuffer = audioEngineRef.current.createBuffer(
      currentBuffer.numberOfChannels,
      currentBuffer.length,
      currentBuffer.sampleRate
    );
    
    if (!newBuffer) return;
    newBuffer.getChannelData(0).set(normalized);
    setCurrentBuffer(newBuffer);
    toast.success('Sample normalized');
  };

  const reverseBuffer = () => {
    if (!currentBuffer || !audioEngineRef.current) return;

    const data = Array.from(currentBuffer.getChannelData(0)).reverse();
    const newBuffer = audioEngineRef.current.createBuffer(
      currentBuffer.numberOfChannels,
      currentBuffer.length,
      currentBuffer.sampleRate
    );
    
    if (!newBuffer) return;
    newBuffer.getChannelData(0).set(data);
    setCurrentBuffer(newBuffer);
    toast.success('Sample reversed');
  };

  const applyFadeIn = () => {
    if (!currentBuffer || !audioEngineRef.current) return;

    const data = currentBuffer.getChannelData(0);
    const fadeLength = Math.floor(data.length * 0.1); // 10% fade
    const faded = data.map((v, i) => {
      if (i < fadeLength) {
        return v * (i / fadeLength);
      }
      return v;
    });

    const newBuffer = audioEngineRef.current.createBuffer(
      currentBuffer.numberOfChannels,
      currentBuffer.length,
      currentBuffer.sampleRate
    );
    
    if (!newBuffer) return;
    newBuffer.getChannelData(0).set(faded);
    setCurrentBuffer(newBuffer);
    toast.success('Fade in applied');
  };

  const applyFadeOut = () => {
    if (!currentBuffer || !audioEngineRef.current) return;

    const data = currentBuffer.getChannelData(0);
    const fadeLength = Math.floor(data.length * 0.1); // 10% fade
    const fadeStart = data.length - fadeLength;
    const faded = data.map((v, i) => {
      if (i > fadeStart) {
        return v * ((data.length - i) / fadeLength);
      }
      return v;
    });

    const newBuffer = audioEngineRef.current.createBuffer(
      currentBuffer.numberOfChannels,
      currentBuffer.length,
      currentBuffer.sampleRate
    );
    
    if (!newBuffer) return;
    newBuffer.getChannelData(0).set(faded);
    setCurrentBuffer(newBuffer);
    toast.success('Fade out applied');
  };

  const loadDefaultPreset = (soundType: string) => {
    const presets: Record<string, any> = {
      kick: {
        waveform: 'sine' as const,
        frequency: 60,
        duration: 0.5,
        amplitude: 0.8,
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.2 }
      },
      snare: {
        waveform: 'noise' as const,
        frequency: 200,
        duration: 0.15,
        amplitude: 0.6,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.05 }
      },
      hihat: {
        waveform: 'noise' as const,
        frequency: 8000,
        duration: 0.08,
        amplitude: 0.4,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.03 }
      },
      clap: {
        waveform: 'noise' as const,
        frequency: 1000,
        duration: 0.1,
        amplitude: 0.7,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.05 }
      },
      tom: {
        waveform: 'sine' as const,
        frequency: 120,
        duration: 0.4,
        amplitude: 0.7,
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.15 }
      },
      bass: {
        waveform: 'sawtooth' as const,
        frequency: 55,
        duration: 1.0,
        amplitude: 0.6,
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 }
      }
    };

    const preset = presets[soundType];
    if (preset) {
      setWaveform(preset.waveform);
      setFrequency(preset.frequency);
      setDuration(preset.duration);
      setAmplitude(preset.amplitude);
      setEnvelope(preset.envelope);
      toast.success(`Loaded ${soundType} preset`);
    }
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

  const handleSave = async () => {
    // If editing a track, update it instead of saving as preset
    if (editingTrackIndex !== undefined && onUpdateTrack && currentBuffer) {
      onUpdateTrack(editingTrackIndex, currentBuffer);
      onSwitchToSequencer?.();
      toast.success('Track updated!');
    } else {
      // Otherwise save as preset
      await savePreset();
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

  const handleAddToDrumMachine = () => {
    if (!currentBuffer) {
      toast.error('No sample to add. Generate a sound first!');
      return;
    }

    if (!onAddTrackToDrumMachine || !onSwitchToSequencer) {
      toast.error('Drum machine integration not available');
      return;
    }

    // Generate a name based on whether it's AI generated or manual
    const trackName = isAiGenerated && aiPrompt 
      ? aiPrompt.substring(0, 20) + (aiPrompt.length > 20 ? '...' : '')
      : `${waveform} ${frequency}Hz`;

    onAddTrackToDrumMachine(trackName, currentBuffer);
    onSwitchToSequencer();
    toast.success(`Added "${trackName}" to drum machine!`);
  };

  const handleNoteOn = async (noteFrequency: number) => {
    if (!audioEngineRef.current) return;

    try {
      // If we have a current buffer, use it with pitch shifting
      // Otherwise generate a new sample at the keyboard frequency
      if (currentBuffer) {
        // Calculate playback rate to shift the current sample to the target frequency
        const playbackRate = noteFrequency / frequency;
        audioEngineRef.current.playSound(currentBuffer, playbackRate);
        
        // Trigger waveform animation
        setIsPlaying(true);
        // Calculate duration based on buffer length and playback rate
        const noteDuration = (currentBuffer.duration / playbackRate) * 1000;
        setTimeout(() => setIsPlaying(false), noteDuration);
      } else {
        // Fallback: generate a sample at the keyboard frequency
        const buffer = await audioEngineRef.current.createSampleFromJSON({
          waveform,
          frequency: noteFrequency,
          duration: 0.5,
          amplitude,
          envelope,
          harmonics: [],
        });
        audioEngineRef.current.playSound(buffer, 1);
        
        // Trigger waveform animation
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 500);
      }
    } catch (error) {
      console.error('Failed to play note:', error);
    }
  };

  const handleNoteOff = () => {
    // Note off handled by envelope
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header with AI Indicator */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Wave Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and customize audio samples
          </p>
        </div>
        
        {isAiGenerated && aiPrompt && (
          <div className="flex items-center justify-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Generated:</span>
            <span className="text-sm text-muted-foreground">"{aiPrompt}"</span>
            <button
              onClick={() => {
                setIsAiGenerated(false);
                setAiPrompt('');
              }}
              className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - AI Command & Waveform */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <AICommandPanel
            currentPrompt={currentPrompt}
            setCurrentPrompt={setCurrentPrompt}
            isGenerating={isGenerating}
            onGenerate={handleGenerateAI}
            onOpenHistory={() => setIsAiModalOpen(true)}
            onLoadPreset={loadDefaultPreset}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <Card className="lg:col-span-2 bg-background/50 backdrop-blur border-border/50 shadow-lg p-6 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Waveform Visualizer</h3>
              <div className="flex-1">
                <WaveformDisplay 
                  audioBuffer={currentBuffer} 
                  isPlaying={isPlaying}
                />
              </div>
            </Card>

            <PlaybackControls
              isPlaying={isPlaying}
              hasBuffer={!!currentBuffer}
              isLoggedIn={!!identity}
              onPlay={handlePlay}
              onSave={handleSave}
              onDownload={handleDownload}
              onAddToDrumMachine={onAddTrackToDrumMachine ? handleAddToDrumMachine : undefined}
            />
          </div>

          <ADSREnvelope
            envelope={envelope}
            onEnvelopeChange={(key, value) => 
              setEnvelope(prev => ({ ...prev, [key]: value[0] }))
            }
          />
        </div>

        {/* Right Column - Controls */}
        <div className="flex flex-col gap-6">
          <WaveformSelector
            waveform={waveform}
            onWaveformChange={setWaveform}
          />

          <SynthControls
            frequency={frequency}
            amplitude={amplitude}
            duration={duration}
            onFrequencyChange={(value) => setFrequency(value[0])}
            onAmplitudeChange={(value) => setAmplitude(value[0])}
            onDurationChange={(value) => setDuration(value[0])}
          />

          <SampleEditingPanel
            hasBuffer={!!currentBuffer}
            onNormalize={normalizeBuffer}
            onReverse={reverseBuffer}
            onFadeIn={applyFadeIn}
            onFadeOut={applyFadeOut}
          />
        </div>
      </div>

      {/* Virtual Keyboard */}
      <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
        <VirtualKeyboard
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
        />
      </Card>

      {/* AI History Modal */}
      <AIHistoryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        messages={aiMessages}
        currentPrompt={currentPrompt}
        setCurrentPrompt={setCurrentPrompt}
        isGenerating={isGenerating}
        onGenerate={handleGenerateAI}
      />
    </div>
  );
}
