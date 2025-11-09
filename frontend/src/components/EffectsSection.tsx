import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { EffectSettings } from '../backend';

interface EffectsSectionProps {
  effects: EffectSettings;
  onChange: (effects: EffectSettings) => void;
}

export default function EffectsSection({ effects, onChange }: EffectsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Delay</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Delay Time</Label>
            <span className="text-sm text-muted-foreground">{effects.delayTime.toFixed(2)}s</span>
          </div>
          <Slider
            value={[effects.delayTime * 100]}
            onValueChange={([value]) => onChange({ ...effects, delayTime: value / 100 })}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Feedback</Label>
            <span className="text-sm text-muted-foreground">{(effects.delayFeedback * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[effects.delayFeedback * 100]}
            onValueChange={([value]) => onChange({ ...effects, delayFeedback: value / 100 })}
            min={0}
            max={90}
            step={1}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Reverb</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Reverb Amount</Label>
            <span className="text-sm text-muted-foreground">{(effects.reverbAmount * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[effects.reverbAmount * 100]}
            onValueChange={([value]) => onChange({ ...effects, reverbAmount: value / 100 })}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}
