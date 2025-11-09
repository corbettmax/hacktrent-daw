import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Square, Download, Wand2, Save, Upload, Music2 } from 'lucide-react';
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
  
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize audio engine
  useEffect(() => {
    const initAudio = async () => {
      const engine = new AudioEngine();
      await engine.initialize();
      audioEngineRef.current = engine;
      await generateSample();
    };

    initAudio();
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
    toast.info('AI generation coming soon!', {
      description: 'This feature will use AI to generate unique samples',
    });
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
            onClick={handleGenerateAI}
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
