import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Square, Upload, Music, Activity, Radio, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { usePatternQueries } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SequencerGrid from '../components/SequencerGrid';
import TrackControls from '../components/TrackControls';
import WaveEditor from './WaveEditor';
import Synthesizer from '../components/Synthesizer';
import MultitrackEditor from '../components/MultitrackEditor';
import { AudioEngine } from '../lib/audioEngine';

export interface DrumTrack {
  id: string;
  name: string;
  icon: string;
  buffer: AudioBuffer | null;
  volume: number;
}

type ViewMode = 'sequencer' | 'editor' | 'synthesizer' | 'multitrack';

export default function DrumMachine() {
  const { identity } = useInternetIdentity();
  const { savePatternMutation, loadPatternQuery, saveTempoMutation, loadTempoQuery } = usePatternQueries();
  
  const [viewMode, setViewMode] = useState<ViewMode>('sequencer');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tempo, setTempo] = useState(120);
  const [pattern, setPattern] = useState<boolean[][]>([]);
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Initialize audio engine and load default samples
  useEffect(() => {
    const initAudio = async () => {
      const engine = new AudioEngine();
      await engine.initialize();
      audioEngineRef.current = engine;

      // Load built-in samples
      const defaultTracks: DrumTrack[] = [
        { id: 'kick', name: 'Kick', icon: '/assets/generated/kick-icon-transparent.dim_64x64.png', buffer: null, volume: 1 },
        { id: 'snare', name: 'Snare', icon: '/assets/generated/snare-icon-transparent.dim_64x64.png', buffer: null, volume: 1 },
        { id: 'hihat', name: 'Hi-Hat', icon: '/assets/generated/hihat-icon-transparent.dim_64x64.png', buffer: null, volume: 1 },
        { id: 'clap', name: 'Clap', icon: '/assets/generated/clap-icon-transparent.dim_64x64.png', buffer: null, volume: 1 },
      ];

      // Generate simple drum sounds
      const loadedTracks = await Promise.all(
        defaultTracks.map(async (track) => {
          const buffer = await engine.generateDrumSound(track.id);
          return { ...track, buffer };
        })
      );

      setTracks(loadedTracks);

      // Initialize empty pattern
      const emptyPattern = Array(4).fill(null).map(() => Array(16).fill(false));
      setPattern(emptyPattern);
    };

    initAudio();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load saved pattern and tempo when identity is available
  useEffect(() => {
    if (identity && loadPatternQuery.data) {
      setPattern(loadPatternQuery.data);
    }
  }, [identity, loadPatternQuery.data]);

  useEffect(() => {
    if (identity && loadTempoQuery.data) {
      setTempo(Number(loadTempoQuery.data));
    }
  }, [identity, loadTempoQuery.data]);

  // Playback loop
  useEffect(() => {
    if (isPlaying && audioEngineRef.current) {
      const stepDuration = (60 / tempo) * 250; // 16th notes

      intervalRef.current = window.setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % 16;
          
          // Play sounds for active steps
          pattern.forEach((trackPattern, trackIndex) => {
            if (trackPattern[nextStep] && tracks[trackIndex]?.buffer) {
              audioEngineRef.current?.playSound(
                tracks[trackIndex].buffer!,
                tracks[trackIndex].volume
              );
            }
          });

          return nextStep;
        });
      }, stepDuration);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isPlaying, tempo, pattern, tracks]);

  const handlePlay = () => {
    if (!isPlaying) {
      setCurrentStep(-1);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleTempoChange = (value: number[]) => {
    const newTempo = value[0];
    setTempo(newTempo);
    
    if (identity) {
      saveTempoMutation.mutate({
        user: identity.getPrincipal(),
        tempo: BigInt(newTempo),
      });
    }
  };

  const handleStepToggle = (trackIndex: number, stepIndex: number) => {
    const newPattern = pattern.map((track, i) =>
      i === trackIndex
        ? track.map((step, j) => (j === stepIndex ? !step : step))
        : track
    );
    setPattern(newPattern);

    if (identity) {
      savePatternMutation.mutate({
        user: identity.getPrincipal(),
        patternName: 'default',
        pattern: newPattern,
      });
    }
  };

  const handleClearPattern = () => {
    const emptyPattern = Array(tracks.length).fill(null).map(() => Array(16).fill(false));
    setPattern(emptyPattern);
    
    if (identity) {
      savePatternMutation.mutate({
        user: identity.getPrincipal(),
        patternName: 'default',
        pattern: emptyPattern,
      });
    }
    
    toast.success('Pattern cleared');
  };

  const handleSampleUpload = async (trackIndex: number, file: File) => {
    if (!audioEngineRef.current) return;

    try {
      const buffer = await audioEngineRef.current.loadAudioFile(file);
      const newTracks = [...tracks];
      newTracks[trackIndex] = { ...newTracks[trackIndex], buffer };
      setTracks(newTracks);
      toast.success(`Loaded ${file.name}`);
    } catch (error) {
      toast.error('Failed to load audio file');
      console.error(error);
    }
  };

  const handleVolumeChange = (trackIndex: number, volume: number) => {
    const newTracks = [...tracks];
    newTracks[trackIndex] = { ...newTracks[trackIndex], volume };
    setTracks(newTracks);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Navigation Tabs */}
          <Card className="p-2 bg-card/50 backdrop-blur border-primary/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant={viewMode === 'sequencer' ? 'default' : 'outline'}
                onClick={() => setViewMode('sequencer')}
              >
                <Music className="mr-2 h-4 w-4" />
                Sequencer
              </Button>
              <Button
                variant={viewMode === 'editor' ? 'default' : 'outline'}
                onClick={() => setViewMode('editor')}
              >
                <Activity className="mr-2 h-4 w-4" />
                Wave Editor
              </Button>
              <Button
                variant={viewMode === 'synthesizer' ? 'default' : 'outline'}
                onClick={() => setViewMode('synthesizer')}
              >
                <Radio className="mr-2 h-4 w-4" />
                Synthesizer
              </Button>
              <Button
                variant={viewMode === 'multitrack' ? 'default' : 'outline'}
                onClick={() => setViewMode('multitrack')}
              >
                <Layers className="mr-2 h-4 w-4" />
                Multitrack
              </Button>
            </div>
          </Card>

          {/* Conditional View Rendering */}
          {viewMode === 'sequencer' ? (
            <>
              {/* Title Section */}
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Drum Machine
                </h1>
                <p className="text-muted-foreground">
                  Create beats with the step sequencer
                </p>
              </div>

          {/* Main Controls */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Playback Controls */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  onClick={handlePlay}
                  className="w-24 bg-primary hover:bg-primary/90"
                >
                  {isPlaying ? (
                    <>
                      <Square className="mr-2 h-5 w-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Play
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStop}
                  className="w-24"
                >
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              </div>

              {/* Tempo Control */}
              <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[300px]">
                <span className="text-sm font-medium whitespace-nowrap">Tempo:</span>
                <Slider
                  value={[tempo]}
                  onValueChange={handleTempoChange}
                  min={60}
                  max={200}
                  step={1}
                  className="flex-1"
                />
                <span className="text-lg font-bold w-16 text-right text-primary">
                  {tempo}
                </span>
              </div>

              {/* Clear Button */}
              <Button
                variant="outline"
                onClick={handleClearPattern}
                className="border-destructive/50 hover:bg-destructive/10"
              >
                Clear
              </Button>
            </div>
          </Card>

          {/* Sequencer Grid */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <div className="space-y-4">
              {tracks.map((track, trackIndex) => (
                <div key={track.id} className="space-y-2">
                  <TrackControls
                    track={track}
                    trackIndex={trackIndex}
                    onSampleUpload={handleSampleUpload}
                    onVolumeChange={handleVolumeChange}
                  />
                  <SequencerGrid
                    pattern={pattern[trackIndex] || Array(16).fill(false)}
                    currentStep={currentStep}
                    isPlaying={isPlaying}
                    onStepToggle={(stepIndex) => handleStepToggle(trackIndex, stepIndex)}
                  />
                </div>
              ))}
            </div>
          </Card>
            </>
          ) : viewMode === 'editor' ? (
            <WaveEditor />
          ) : viewMode === 'synthesizer' ? (
            <Synthesizer />
          ) : (
            <MultitrackEditor />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
