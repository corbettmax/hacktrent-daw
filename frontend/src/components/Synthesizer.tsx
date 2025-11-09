import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OscillatorSection from './OscillatorSection';
import EnvelopeSection from './EnvelopeSection';
import FilterSection from './FilterSection';
import EffectsSection from './EffectsSection';
import WaveformDisplay from './WaveformDisplay';
import VirtualKeyboard from './VirtualKeyboard';
import PresetManager from './PresetManager';
import { SynthEngine } from '../lib/synthEngine';
import { toast } from 'sonner';

interface SynthSettings {
  oscillators: Array<{ waveform: string; detune: number; volume: number }>;
  envelope: { attack: number; decay: number; sustain: number; release: number };
  filter: { filterType: string; cutoff: number; resonance: number };
  effects: { delayTime: number; delayFeedback: number; reverbAmount: number };
}

export default function Synthesizer() {
  const synthEngineRef = useRef<SynthEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<SynthSettings>({
    oscillators: [
      { waveform: 'sine', detune: 0, volume: 0.5 },
      { waveform: 'sawtooth', detune: 0, volume: 0.3 }
    ],
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.3 },
    filter: { filterType: 'lowpass', cutoff: 2000, resonance: 1 },
    effects: { delayTime: 0.3, delayFeedback: 0.3, reverbAmount: 0.2 }
  });

  useEffect(() => {
    const initSynth = async () => {
      try {
        const engine = new SynthEngine();
        await engine.initialize();
        synthEngineRef.current = engine;
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize synthesizer:', error);
        toast.error('Failed to initialize audio system');
      }
    };

    initSynth();

    return () => {
      if (synthEngineRef.current) {
        synthEngineRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (synthEngineRef.current && isInitialized) {
      synthEngineRef.current.updateSettings(settings);
    }
  }, [settings, isInitialized]);

  const handleNoteOn = (frequency: number) => {
    if (synthEngineRef.current) {
      synthEngineRef.current.noteOn(frequency);
    }
  };

  const handleNoteOff = () => {
    if (synthEngineRef.current) {
      synthEngineRef.current.noteOff();
    }
  };

  const handleLoadPreset = (newSettings: SynthSettings) => {
    setSettings(newSettings);
    toast.success('Preset loaded successfully');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing audio engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Waveform Display
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WaveformDisplay synthEngine={synthEngineRef.current} />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Virtual Keyboard</CardTitle>
            </CardHeader>
            <CardContent>
              <VirtualKeyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PresetManager currentSettings={settings} onLoadPreset={handleLoadPreset} />
        </div>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>Sound Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="oscillators" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="oscillators">Oscillators</TabsTrigger>
              <TabsTrigger value="envelope">Envelope</TabsTrigger>
              <TabsTrigger value="filter">Filter</TabsTrigger>
              <TabsTrigger value="effects">Effects</TabsTrigger>
            </TabsList>

            <TabsContent value="oscillators" className="space-y-4 mt-6">
              <OscillatorSection
                oscillators={settings.oscillators}
                onChange={(oscillators) => setSettings({ ...settings, oscillators })}
              />
            </TabsContent>

            <TabsContent value="envelope" className="space-y-4 mt-6">
              <EnvelopeSection
                envelope={settings.envelope}
                onChange={(envelope) => setSettings({ ...settings, envelope })}
              />
            </TabsContent>

            <TabsContent value="filter" className="space-y-4 mt-6">
              <FilterSection
                filter={settings.filter}
                onChange={(filter) => setSettings({ ...settings, filter })}
              />
            </TabsContent>

            <TabsContent value="effects" className="space-y-4 mt-6">
              <EffectsSection
                effects={settings.effects}
                onChange={(effects) => setSettings({ ...settings, effects })}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
