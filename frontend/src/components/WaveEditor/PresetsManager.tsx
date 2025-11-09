import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

interface PresetsManagerProps {
  presets: WavePreset[];
  isLoggedIn: boolean;
  onLoadPreset: (preset: WavePreset) => void;
}

export default function PresetsManager({ presets, isLoggedIn, onLoadPreset }: PresetsManagerProps) {
  const defaultPresets = [
    { id: 'sine', name: 'Sine Wave' },
    { id: 'square', name: 'Square Wave' },
    { id: 'sawtooth', name: 'Sawtooth' },
    { id: 'triangle', name: 'Triangle' },
  ];

  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Presets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Default Waveforms</p>
          <div className="grid grid-cols-2 gap-2">
            {defaultPresets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {presets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Saved Presets</p>
            <div className="space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadPreset(preset)}
                  className="w-full justify-start text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Log in to save and load presets
          </p>
        )}
      </CardContent>
    </Card>
  );
}
