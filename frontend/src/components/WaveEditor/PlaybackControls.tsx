import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, Square, Save, Download, Plus } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  hasBuffer: boolean;
  isLoggedIn: boolean;
  onPlay: () => void;
  onSave?: () => void;
  onDownload: () => void;
  onAddToDrumMachine?: () => void;
}

export default function PlaybackControls({
  isPlaying,
  hasBuffer,
  isLoggedIn,
  onPlay,
  onSave,
  onDownload,
  onAddToDrumMachine,
}: PlaybackControlsProps) {
  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Playback</CardTitle>
        <p className="text-xs text-muted-foreground">Controls</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={onPlay}
          disabled={isPlaying || !hasBuffer}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
          size="default"
        >
          {isPlaying ? (
            <>
              <Square className="mr-2 h-4 w-4" />
              Playing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Play
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" disabled={!isLoggedIn} onClick={onSave}>
            <Save className="mr-1 h-3 w-3" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload} disabled={!hasBuffer}>
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
        </div>

        {onAddToDrumMachine && (
          <Button
            onClick={onAddToDrumMachine}
            disabled={!hasBuffer}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add to Drum Machine
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
