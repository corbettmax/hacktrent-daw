import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, Volume2, ChevronDown, Pencil } from 'lucide-react';
import { DrumTrack } from '../pages/DrumMachine';

interface TrackControlsProps {
  track: DrumTrack;
  trackIndex: number;
  onSampleUpload: (trackIndex: number, file: File) => void;
  onVolumeChange: (trackIndex: number, volume: number) => void;
  onNameChange: (trackIndex: number, name: string) => void;
  onColorChange: (trackIndex: number, color: string) => void;
  onEditWaveform: (trackIndex: number) => void;
}

// Desmos color palette
const DESMOS_COLORS = [
  '#c74440', // red
  '#2d70b3', // blue
  '#388c46', // green
  '#6042a6', // purple
  '#fa7e19', // orange
  '#000000', // black
  '#6ca0dc', // light blue
  '#2f8e3f', // dark green
  '#a8297b', // magenta
  '#5f4c2d', // brown
  '#fdb632', // yellow
  '#c2185b', // pink
];

export default function TrackControls({
  track,
  trackIndex,
  onSampleUpload,
  onVolumeChange,
  onNameChange,
  onColorChange,
  onEditWaveform,
}: TrackControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(track.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSampleUpload(trackIndex, file);
    }
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (editedName.trim() && editedName !== track.name) {
      onNameChange(trackIndex, editedName.trim());
    } else {
      setEditedName(track.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setEditedName(track.name);
      setIsEditingName(false);
    }
  };

  const handleColorSelect = (color: string) => {
    onColorChange(trackIndex, color);
    setShowColorPicker(false);
  };

  return (
    <div className="flex items-center gap-4 mb-2">
      <div className="flex items-center gap-3 min-w-[180px]">
        {/* Color Circle with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="group relative flex items-center justify-center"
            title="Change color"
          >
            <div 
              className="h-8 w-8 rounded-full border-2 border-border transition-transform group-hover:scale-110 cursor-pointer shadow-md"
              style={{ backgroundColor: track.color }}
            />
            <ChevronDown className="h-3 w-3 absolute -bottom-1 -right-1 bg-background rounded-full opacity-70 group-hover:opacity-100" />
          </button>
          
          {/* Color Picker Dropdown */}
          {showColorPicker && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowColorPicker(false)}
              />
              <div 
                ref={colorPickerRef}
                className="absolute top-10 left-0 z-20 bg-card border border-border rounded-lg shadow-lg p-3 grid grid-cols-4 gap-2"
              >
                {DESMOS_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ 
                      backgroundColor: color,
                      borderColor: color === track.color ? '#fff' : 'transparent'
                    }}
                    title={color}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="font-medium text-sm bg-background border border-primary/50 rounded px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        ) : (
          <span 
            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditingName(true)}
            title="Click to edit"
          >
            {track.name}
          </span>
        )}
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
        onClick={() => onEditWaveform(trackIndex)}
        className="gap-2"
      >
        <Pencil className="h-4 w-4" />
        <span className="hidden sm:inline">Edit</span>
      </Button>

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
