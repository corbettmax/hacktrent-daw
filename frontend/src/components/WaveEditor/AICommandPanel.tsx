import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles, Music2 } from 'lucide-react';

interface AICommandPanelProps {
  currentPrompt: string;
  setCurrentPrompt: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onOpenHistory: () => void;
  onLoadPreset: (soundType: string) => void;
}

export default function AICommandPanel({
  currentPrompt,
  setCurrentPrompt,
  isGenerating,
  onGenerate,
  onOpenHistory,
  onLoadPreset,
}: AICommandPanelProps) {
  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">AI Command</CardTitle>
        <p className="text-xs text-muted-foreground">Tell the AI what sounds to play or patterns to create</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Command</label>
          <input
            type="text"
            placeholder="e.g., 'deep bass kick', 'bright synth lead'"
            className="w-full px-4 py-3 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && currentPrompt.trim()) {
                onGenerate();
              }
            }}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !currentPrompt.trim()}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
            size="lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Sound
          </Button>
          
          <Button
            onClick={onOpenHistory}
            variant="outline"
            size="lg"
          >
            <Music2 className="mr-2 h-4 w-4" />
            View History
          </Button>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">Available sounds:</p>
          <div className="flex flex-wrap gap-2">
            {['kick', 'snare', 'hihat', 'clap', 'tom', 'bass'].map((sound) => (
              <button
                key={sound}
                onClick={() => onLoadPreset(sound)}
                className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 text-xs transition-colors"
              >
                {sound}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
