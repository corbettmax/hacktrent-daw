import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Download } from 'lucide-react';
import { useSavePreset, useListPresets, useGetPreset } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { SynthPreset } from '../backend';

interface SynthSettings {
  oscillators: Array<{ waveform: string; detune: number; volume: number }>;
  envelope: { attack: number; decay: number; sustain: number; release: number };
  filter: { filterType: string; cutoff: number; resonance: number };
  effects: { delayTime: number; delayFeedback: number; reverbAmount: number };
}

interface PresetManagerProps {
  currentSettings: SynthSettings;
  onLoadPreset: (settings: SynthSettings) => void;
}

export default function PresetManager({ currentSettings, onLoadPreset }: PresetManagerProps) {
  const [presetName, setPresetName] = useState('');
  const savePreset = useSavePreset();
  const { data: presetNames = [], refetch } = useListPresets();
  const getPreset = useGetPreset();

  const handleSave = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    try {
      await savePreset.mutateAsync({ 
        name: presetName.trim(), 
        settings: currentSettings 
      });
      toast.success(`Preset "${presetName}" saved successfully`);
      setPresetName('');
      refetch();
    } catch (error) {
      toast.error('Failed to save preset');
      console.error(error);
    }
  };

  const handleLoad = async (name: string) => {
    try {
      const preset = await getPreset.mutateAsync(name);
      if (preset) {
        onLoadPreset({
          oscillators: preset.oscillators,
          envelope: preset.envelope,
          filter: preset.filter,
          effects: preset.effects
        });
      } else {
        toast.error('Preset not found');
      }
    } catch (error) {
      toast.error('Failed to load preset');
      console.error(error);
    }
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle>Preset Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preset-name">Save Current Settings</Label>
          <div className="flex gap-2">
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPresetName(e.target.value)}
              placeholder="Enter preset name"
            />
            <Button onClick={handleSave} disabled={savePreset.isPending} size="sm">
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Saved Presets</Label>
          <ScrollArea className="h-64 rounded-md border border-border/50 p-2">
            {presetNames.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No presets saved yet
              </div>
            ) : (
              <div className="space-y-2">
                {presetNames.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm font-medium truncate flex-1">{name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoad(name)}
                      disabled={getPreset.isPending}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
