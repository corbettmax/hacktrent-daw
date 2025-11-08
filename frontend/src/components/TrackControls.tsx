import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, Volume2 } from 'lucide-react';
import { DrumTrack } from '../pages/DrumMachine';

interface TrackControlsProps {
  track: DrumTrack;
  trackIndex: number;
  onSampleUpload: (trackIndex: number, file: File) => void;
  onVolumeChange: (trackIndex: number, volume: number) => void;
}

export default function TrackControls({
  track,
  trackIndex,
  onSampleUpload,
  onVolumeChange,
}: TrackControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSampleUpload(trackIndex, file);
    }
  };

  return (
    <div className="flex items-center gap-4 mb-2">
      <div className="flex items-center gap-3 min-w-[140px]">
        <img
          src={track.icon}
          alt={track.name}
          className="h-8 w-8 object-contain"
        />
        <span className="font-medium text-sm">{track.name}</span>
      </div>

      <div className="flex items-center gap-2 flex-1">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          value={[track.volume * 100]}
          onValueChange={(value) => onVolumeChange(trackIndex, value[0] / 100)}
          min={0}
          max={100}
          step={1}
          className="w-24"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
