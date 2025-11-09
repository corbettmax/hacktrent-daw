import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { EnvelopeSettings } from '../backend';

interface EnvelopeSectionProps {
  envelope: EnvelopeSettings;
  onChange: (envelope: EnvelopeSettings) => void;
}

export default function EnvelopeSection({ envelope, onChange }: EnvelopeSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Attack</Label>
          <span className="text-sm text-muted-foreground">{envelope.attack.toFixed(2)}s</span>
        </div>
        <Slider
          value={[envelope.attack * 100]}
          onValueChange={([value]) => onChange({ ...envelope, attack: value / 100 })}
          min={0}
          max={200}
          step={1}
        />
        <p className="text-xs text-muted-foreground">Time to reach full volume</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Decay</Label>
          <span className="text-sm text-muted-foreground">{envelope.decay.toFixed(2)}s</span>
        </div>
        <Slider
          value={[envelope.decay * 100]}
          onValueChange={([value]) => onChange({ ...envelope, decay: value / 100 })}
          min={0}
          max={200}
          step={1}
        />
        <p className="text-xs text-muted-foreground">Time to drop to sustain level</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Sustain</Label>
          <span className="text-sm text-muted-foreground">{(envelope.sustain * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[envelope.sustain * 100]}
          onValueChange={([value]) => onChange({ ...envelope, sustain: value / 100 })}
          min={0}
          max={100}
          step={1}
        />
        <p className="text-xs text-muted-foreground">Sustained volume level</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Release</Label>
          <span className="text-sm text-muted-foreground">{envelope.release.toFixed(2)}s</span>
        </div>
        <Slider
          value={[envelope.release * 100]}
          onValueChange={([value]) => onChange({ ...envelope, release: value / 100 })}
          min={0}
          max={200}
          step={1}
        />
        <p className="text-xs text-muted-foreground">Time to fade after release</p>
      </div>
    </div>
  );
}
