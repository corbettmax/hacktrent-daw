import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SampleEditingPanelProps {
  hasBuffer: boolean;
  onNormalize: () => void;
  onReverse: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
}

export default function SampleEditingPanel({
  hasBuffer,
  onNormalize,
  onReverse,
  onFadeIn,
  onFadeOut,
}: SampleEditingPanelProps) {
  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Sample Editing</CardTitle>
        <p className="text-xs text-muted-foreground">Modify your audio sample</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={onNormalize}
          disabled={!hasBuffer}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          Normalize
        </Button>
        <Button
          onClick={onReverse}
          disabled={!hasBuffer}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          Reverse
        </Button>
        <Button
          onClick={onFadeIn}
          disabled={!hasBuffer}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          Fade In
        </Button>
        <Button
          onClick={onFadeOut}
          disabled={!hasBuffer}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          Fade Out
        </Button>
      </CardContent>
    </Card>
  );
}
