import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, Square, Save, Download } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  hasBuffer: boolean;
  isLoggedIn: boolean;
  onPlay: () => void;
  onSave?: () => void;
  onDownload: () => void;
}

export default function PlaybackControls({
  isPlaying,
  hasBuffer,
  isLoggedIn,
  onPlay,
  onSave,
  onDownload,
}: PlaybackControlsProps) {
  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Playback Controls</CardTitle>
        <p className="text-xs text-muted-foreground">Play, save, and export your beat</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={onPlay}
          disabled={isPlaying || !hasBuffer}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
          size="lg"
        >
          {isPlaying ? (
            <>
              <Square className="mr-2 h-5 w-5" />
              Playing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Play Synth
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" disabled={!isLoggedIn} onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Preset
          </Button>
          <Button variant="outline" size="lg" onClick={onDownload} disabled={!hasBuffer}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
