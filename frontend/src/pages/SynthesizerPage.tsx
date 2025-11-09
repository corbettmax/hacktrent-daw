import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save, Upload, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import OscillatorSection from '../components/OscillatorSection';
import EnvelopeSection from '../components/EnvelopeSection';
import FilterSection from '../components/FilterSection';
import EffectsSection from '../components/EffectsSection';
import VirtualKeyboard from '../components/VirtualKeyboard';
import WaveformDisplay from '../components/WaveformDisplay';
import { SynthEngine, SynthSettings } from '../lib/synthEngine';

interface SavedPreset {
  id: string;
  name: string;
  settings: SynthSettings;
  createdAt: Date;
}

export default function SynthesizerPage() {
  const { identity } = useInternetIdentity();
  const [settings, setSettings] = useState<SynthSettings>({
    oscillators: [
      { waveform: 'sine', detune: 0, volume: 0.5 },
      { waveform: 'sawtooth', detune: 7, volume: 0.3 },
    ],
    envelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.7,
      release: 0.5,
    },
    filter: {
      filterType: 'lowpass',
      cutoff: 2000,
      resonance: 1,
    },
    effects: {
      delayTime: 0.3,
      delayFeedback: 0.3,
      reverbAmount: 0.2,
    },
  });

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const synthRef = useRef<SynthEngine | null>(null);
  const animationRef = useRef<number>(0);

  // Initialize synthesizer
  useEffect(() => {
    const initSynth = async () => {
      const synth = new SynthEngine();
      await synth.initialize();
      synth.updateSettings(settings);
      synthRef.current = synth;
    };

    initSynth();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      synthRef.current?.dispose();
    };
  }, []);

  // Load saved presets from backend
  useEffect(() => {
    if (identity) {
      loadPresets();
    }
  }, [identity]);

  // Update synth when settings change
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.updateSettings(settings);
    }
  }, [settings]);

  const loadPresets = async () => {
    if (!identity) return;

    try {
      const user = identity.getPrincipal().toString();
      const response = await fetch(`/pattern/${user}/synth-presets`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setSavedPresets(data.map((preset: any, index: number) => ({
            id: `preset-${index}`,
            name: preset.name || `Preset ${index + 1}`,
            settings: preset.settings,
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
      const response = await fetch(`/pattern/${user}/synth-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName,
          settings,
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

  const loadPreset = (preset: SavedPreset) => {
    setSettings(preset.settings);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleNoteOn = (frequency: number) => {
    synthRef.current?.noteOn(frequency);
  };

  const handleNoteOff = () => {
    synthRef.current?.noteOff();
  };

  return (
    <div className="space-y-8">
      {/* Title Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Synthesizer Studio
        </h1>
        <p className="text-muted-foreground">
          Create and save custom synthesizer sounds
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

      {/* Waveform Display */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <WaveformDisplay synthEngine={synthRef.current} />
      </Card>

      {/* Virtual Keyboard */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Virtual Keyboard</h3>
          <VirtualKeyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
          <p className="text-xs text-muted-foreground text-center">
            Click and hold keys to play notes
          </p>
        </div>
      </Card>

      {/* Synthesizer Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Oscillators */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Oscillators</h3>
            <OscillatorSection
              oscillators={settings.oscillators}
              onChange={(oscillators) => setSettings({ ...settings, oscillators })}
            />
          </div>
        </Card>

        {/* Envelope */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Envelope (ADSR)</h3>
            <EnvelopeSection
              envelope={settings.envelope}
              onChange={(envelope) => setSettings({ ...settings, envelope })}
            />
          </div>
        </Card>

        {/* Filter */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Filter</h3>
            <FilterSection
              filter={settings.filter}
              onChange={(filter) => setSettings({ ...settings, filter })}
            />
          </div>
        </Card>

        {/* Effects */}
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Effects</h3>
            <EffectsSection
              effects={settings.effects}
              onChange={(effects) => setSettings({ ...settings, effects })}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
