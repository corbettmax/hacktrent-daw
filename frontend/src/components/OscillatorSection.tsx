import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OscillatorSettings } from '../backend';

interface OscillatorSectionProps {
  oscillators: OscillatorSettings[];
  onChange: (oscillators: OscillatorSettings[]) => void;
}

export default function OscillatorSection({ oscillators, onChange }: OscillatorSectionProps) {
  const updateOscillator = (index: number, updates: Partial<OscillatorSettings>) => {
    const newOscillators = [...oscillators];
    newOscillators[index] = { ...newOscillators[index], ...updates };
    onChange(newOscillators);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {oscillators.map((osc, index) => (
        <Card key={index} className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Oscillator {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Waveform</Label>
              <Select value={osc.waveform} onValueChange={(value) => updateOscillator(index, { waveform: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sine">Sine</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="sawtooth">Sawtooth</SelectItem>
                  <SelectItem value="triangle">Triangle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Detune</Label>
                <span className="text-sm text-muted-foreground">{osc.detune.toFixed(0)} cents</span>
              </div>
              <Slider
                value={[osc.detune]}
                onValueChange={([value]) => updateOscillator(index, { detune: value })}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Volume</Label>
                <span className="text-sm text-muted-foreground">{(osc.volume * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[osc.volume * 100]}
                onValueChange={([value]) => updateOscillator(index, { volume: value / 100 })}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
