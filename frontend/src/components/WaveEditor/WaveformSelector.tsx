import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WaveformSelectorProps {
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
  onWaveformChange: (waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise') => void;
}

export default function WaveformSelector({ waveform, onWaveformChange }: WaveformSelectorProps) {
  const waveforms: Array<'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'> = [
    'sine',
    'square',
    'sawtooth',
    'triangle',
    'noise',
  ];

  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Waveform</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <select
          value={waveform}
          onChange={(e) => onWaveformChange(e.target.value as any)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {waveforms.map((w) => (
            <option key={w} value={w}>
              {w.charAt(0).toUpperCase() + w.slice(1)}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
