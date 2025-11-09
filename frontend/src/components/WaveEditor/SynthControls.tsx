import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface SynthControlsProps {
  frequency: number;
  amplitude: number;
  duration: number;
  onFrequencyChange: (value: number[]) => void;
  onAmplitudeChange: (value: number[]) => void;
  onDurationChange: (value: number[]) => void;
}

export default function SynthControls({
  frequency,
  amplitude,
  duration,
  onFrequencyChange,
  onAmplitudeChange,
  onDurationChange,
}: SynthControlsProps) {
  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Sound Parameters</CardTitle>
        <p className="text-xs text-muted-foreground">Adjust frequency, volume, and duration</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Frequency</label>
            <span className="text-xs font-medium">{frequency} Hz</span>
          </div>
          <Slider
            value={[frequency]}
            onValueChange={onFrequencyChange}
            min={20}
            max={2000}
            step={1}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Volume</label>
            <span className="text-xs font-medium">{Math.round(amplitude * 100)}%</span>
          </div>
          <Slider
            value={[amplitude]}
            onValueChange={onAmplitudeChange}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Duration</label>
            <span className="text-xs font-medium">{duration.toFixed(2)}s</span>
          </div>
          <Slider
            value={[duration]}
            onValueChange={onDurationChange}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
