import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface ADSREnvelopeProps {
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  onEnvelopeChange: (key: 'attack' | 'decay' | 'sustain' | 'release', value: number[]) => void;
}

export default function ADSREnvelope({ envelope, onEnvelopeChange }: ADSREnvelopeProps) {
  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">ADSR Envelope</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Attack</label>
            <span className="text-xs font-medium">{envelope.attack.toFixed(3)}s</span>
          </div>
          <Slider
            value={[envelope.attack]}
            onValueChange={(value) => onEnvelopeChange('attack', value)}
            min={0.001}
            max={2}
            step={0.001}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Decay</label>
            <span className="text-xs font-medium">{envelope.decay.toFixed(3)}s</span>
          </div>
          <Slider
            value={[envelope.decay]}
            onValueChange={(value) => onEnvelopeChange('decay', value)}
            min={0.001}
            max={2}
            step={0.001}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Sustain</label>
            <span className="text-xs font-medium">{envelope.sustain.toFixed(2)}</span>
          </div>
          <Slider
            value={[envelope.sustain]}
            onValueChange={(value) => onEnvelopeChange('sustain', value)}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Release</label>
            <span className="text-xs font-medium">{envelope.release.toFixed(3)}s</span>
          </div>
          <Slider
            value={[envelope.release]}
            onValueChange={(value) => onEnvelopeChange('release', value)}
            min={0.001}
            max={5}
            step={0.001}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
