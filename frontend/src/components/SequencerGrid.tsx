import { cn } from '@/lib/utils';

interface SequencerGridProps {
  pattern: boolean[];
  currentStep: number;
  isPlaying: boolean;
  onStepToggle: (stepIndex: number) => void;
}

export default function SequencerGrid({
  pattern,
  currentStep,
  isPlaying,
  onStepToggle,
}: SequencerGridProps) {
  return (
    <div className="grid grid-cols-16 gap-1">
      {pattern.map((isActive, stepIndex) => {
        const isCurrentStep = isPlaying && currentStep === stepIndex;
        const isBeat = stepIndex % 4 === 0;

        return (
          <button
            key={stepIndex}
            onClick={() => onStepToggle(stepIndex)}
            className={cn(
              'aspect-square rounded-md transition-all duration-150 border-2',
              'hover:scale-105 active:scale-95',
              isActive
                ? 'bg-primary border-primary shadow-lg shadow-primary/50'
                : isBeat
                ? 'bg-muted/50 border-muted hover:bg-muted'
                : 'bg-background border-border hover:bg-muted/30',
              isCurrentStep && 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-110'
            )}
            aria-label={`Step ${stepIndex + 1}`}
          />
        );
      })}
    </div>
  );
}
