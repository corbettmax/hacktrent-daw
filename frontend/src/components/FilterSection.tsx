import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { FilterSettings } from '../backend';

interface FilterSectionProps {
  filter: FilterSettings;
  onChange: (filter: FilterSettings) => void;
}

export default function FilterSection({ filter, onChange }: FilterSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Filter Type</Label>
        <Select
          value={filter.filterType}
          onValueChange={(value) => onChange({ ...filter, filterType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lowpass">Low-pass</SelectItem>
            <SelectItem value="highpass">High-pass</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Cutoff Frequency</Label>
          <span className="text-sm text-muted-foreground">{filter.cutoff.toFixed(0)} Hz</span>
        </div>
        <Slider
          value={[filter.cutoff]}
          onValueChange={([value]) => onChange({ ...filter, cutoff: value })}
          min={20}
          max={20000}
          step={10}
        />
        <p className="text-xs text-muted-foreground">Frequency where the filter starts to take effect</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Resonance</Label>
          <span className="text-sm text-muted-foreground">{filter.resonance.toFixed(1)}</span>
        </div>
        <Slider
          value={[filter.resonance]}
          onValueChange={([value]) => onChange({ ...filter, resonance: value })}
          min={0.1}
          max={30}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">Emphasis at the cutoff frequency</p>
      </div>
    </div>
  );
}
