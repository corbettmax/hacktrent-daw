import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface VirtualKeyboardProps {
  onNoteOn: (frequency: number) => void;
  onNoteOff: () => void;
}

const notes = [
  { note: 'C', frequency: 261.63, isBlack: false },
  { note: 'C#', frequency: 277.18, isBlack: true },
  { note: 'D', frequency: 293.66, isBlack: false },
  { note: 'D#', frequency: 311.13, isBlack: true },
  { note: 'E', frequency: 329.63, isBlack: false },
  { note: 'F', frequency: 349.23, isBlack: false },
  { note: 'F#', frequency: 369.99, isBlack: true },
  { note: 'G', frequency: 392.0, isBlack: false },
  { note: 'G#', frequency: 415.3, isBlack: true },
  { note: 'A', frequency: 440.0, isBlack: false },
  { note: 'A#', frequency: 466.16, isBlack: true },
  { note: 'B', frequency: 493.88, isBlack: false },
  { note: 'C5', frequency: 523.25, isBlack: false }
];

export default function VirtualKeyboard({ onNoteOn, onNoteOff }: VirtualKeyboardProps) {
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const handleMouseDown = (note: string, frequency: number) => {
    setActiveNote(note);
    onNoteOn(frequency);
  };

  const handleMouseUp = () => {
    setActiveNote(null);
    onNoteOff();
  };

  const handleMouseLeave = () => {
    if (activeNote) {
      setActiveNote(null);
      onNoteOff();
    }
  };

  return (
    <div className="relative h-48 flex items-end" onMouseLeave={handleMouseLeave}>
      {notes.map((note, index) => (
        <button
          key={index}
          onMouseDown={() => handleMouseDown(note.note, note.frequency)}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (activeNote === note.note) {
              handleMouseUp();
            }
          }}
          className={`
            relative select-none transition-all
            ${
              note.isBlack
                ? 'w-12 h-28 bg-gradient-to-b from-gray-900 to-gray-800 border border-gray-700 -mx-6 z-10 rounded-b-md shadow-lg'
                : 'flex-1 h-48 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 rounded-b-md shadow-md'
            }
            ${activeNote === note.note ? (note.isBlack ? 'bg-primary' : 'bg-primary/20') : ''}
            hover:brightness-110
          `}
        >
          <span
            className={`
            absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium
            ${note.isBlack ? 'text-white' : 'text-gray-600 dark:text-gray-400'}
          `}
          >
            {note.note}
          </span>
        </button>
      ))}
    </div>
  );
}
