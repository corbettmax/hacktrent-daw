import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Plus, Trash2, Volume2, Edit2, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface AudioTrack {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
}

export default function MultitrackEditor() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const panNodesRef = useRef<Map<string, StereoPannerNode>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      stopPlayback();
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (tracks.length > 0) {
      const maxDuration = Math.max(...tracks.map(t => t.buffer?.duration || 0));
      setDuration(maxDuration);
    }
  }, [tracks]);

  useEffect(() => {
    drawWaveforms();
  }, [tracks, currentTime]);

  const addTrack = () => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
    const newTrack: AudioTrack = {
      id: `track-${Date.now()}`,
      name: `Track ${tracks.length + 1}`,
      buffer: null,
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      color: colors[tracks.length % colors.length],
    };
    setTracks([...tracks, newTrack]);
    toast.success('Track added');
  };

  const deleteTrack = (trackId: string) => {
    setTracks(tracks.filter(t => t.id !== trackId));
    gainNodesRef.current.delete(trackId);
    panNodesRef.current.delete(trackId);
    toast.success('Track deleted');
  };

  const handleFileUpload = async (trackId: string, file: File) => {
    if (!audioContextRef.current) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      setTracks(tracks.map(t =>
        t.id === trackId ? { ...t, buffer: audioBuffer, name: file.name.replace(/\.[^/.]+$/, '') } : t
      ));

      toast.success('Audio loaded');
    } catch (error) {
      console.error('Failed to load audio:', error);
      toast.error('Failed to load audio file');
    }
  };

  const startRecording = async (trackId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        
        if (audioContextRef.current) {
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          setTracks(tracks.map(t =>
            t.id === trackId ? { ...t, buffer: audioBuffer, name: `Recording ${Date.now()}` } : t
          ));
          toast.success('Recording saved');
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSelectedTrack(trackId);
      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSelectedTrack(null);
    }
  };

  const playTrack = () => {
    if (!audioContextRef.current) return;

    stopPlayback();

    const ctx = audioContextRef.current;
    const hasSolo = tracks.some(t => t.solo);
    startTimeRef.current = ctx.currentTime - currentTime;

    tracks.forEach(track => {
      if (!track.buffer) return;
      if (track.muted) return;
      if (hasSolo && !track.solo) return;

      const source = ctx.createBufferSource();
      source.buffer = track.buffer;

      // Create or get gain node
      let gainNode = gainNodesRef.current.get(track.id);
      if (!gainNode) {
        gainNode = ctx.createGain();
        gainNodesRef.current.set(track.id, gainNode);
      }
      gainNode.gain.value = track.volume;

      // Create or get pan node
      let panNode = panNodesRef.current.get(track.id);
      if (!panNode) {
        panNode = ctx.createStereoPanner();
        panNodesRef.current.set(track.id, panNode);
      }
      panNode.pan.value = track.pan;

      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(ctx.destination);

      source.start(0, currentTime);
      sourceNodesRef.current.push(source);

      source.onended = () => {
        if (sourceNodesRef.current.length === 1) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      };
    });

    setIsPlaying(true);
    animatePlayhead();
  };

  const stopPlayback = () => {
    sourceNodesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    sourceNodesRef.current = [];
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(false);
  };

  const animatePlayhead = () => {
    if (!audioContextRef.current) return;

    const updateTime = () => {
      if (!isPlaying) return;
      
      const elapsed = audioContextRef.current!.currentTime - startTimeRef.current;
      setCurrentTime(Math.min(elapsed, duration));

      if (elapsed >= duration) {
        stopPlayback();
        setCurrentTime(0);
      } else {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    updateTime();
  };

  const updateTrackVolume = (trackId: string, volume: number) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, volume } : t));
    const gainNode = gainNodesRef.current.get(trackId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  };

  const updateTrackPan = (trackId: string, pan: number) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, pan } : t));
    const panNode = panNodesRef.current.get(trackId);
    if (panNode) {
      panNode.pan.value = pan;
    }
  };

  const toggleMute = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  };

  const toggleSolo = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t));
  };

  const drawWaveforms = () => {
    const canvas = canvasRef.current;
    if (!canvas || tracks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const trackHeight = height / Math.max(tracks.length, 1);

    ctx.clearRect(0, 0, width, height);

    // Draw tracks
    tracks.forEach((track, index) => {
      const y = index * trackHeight;

      // Draw track background
      ctx.fillStyle = track.color + '20';
      ctx.fillRect(0, y, width, trackHeight);

      // Draw waveform
      if (track.buffer) {
        const data = track.buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = trackHeight / 2;

        ctx.strokeStyle = track.color;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
          const min = Math.min(...Array.from({ length: step }, (_, j) => data[i * step + j] || 0));
          const max = Math.max(...Array.from({ length: step }, (_, j) => data[i * step + j] || 0));
          
          if (i === 0) {
            ctx.moveTo(i, y + amp - min * amp);
          }
          ctx.lineTo(i, y + amp - min * amp);
          ctx.lineTo(i, y + amp - max * amp);
        }

        ctx.stroke();
      }

      // Draw separator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, y + trackHeight);
      ctx.lineTo(width, y + trackHeight);
      ctx.stroke();
    });

    // Draw playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Multitrack Editor
        </h1>
        <p className="text-muted-foreground">
          Record, layer, and mix multiple audio tracks
        </p>
      </div>

      {/* Transport Controls */}
      <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={isPlaying ? stopPlayback : playTrack}
              disabled={tracks.length === 0 || tracks.every(t => !t.buffer)}
            >
              {isPlaying ? (
                <>
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Play
                </>
              )}
            </Button>
            <Button variant="outline" onClick={addTrack}>
              <Plus className="mr-2 h-4 w-4" />
              Add Track
            </Button>
            {isRecording && (
              <Button variant="outline" onClick={stopRecording}>
                <Square className="mr-2 h-4 w-4 text-red-500" />
                Stop Recording
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </Card>

      {/* Waveform Display */}
      {tracks.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <canvas
            ref={canvasRef}
            width={1200}
            height={Math.max(tracks.length * 100, 200)}
            className="w-full rounded-lg bg-black/20"
            style={{ height: `${Math.max(tracks.length * 100, 200)}px` }}
          />
        </Card>
      )}

      {/* Tracks List */}
      <div className="space-y-4">
        {tracks.map((track) => (
          <Card key={track.id} className="p-4 bg-card/50 backdrop-blur border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <input
                    type="text"
                    value={track.name}
                    onChange={(e) => setTracks(tracks.map(t =>
                      t.id === track.id ? { ...t, name: e.target.value } : t
                    ))}
                    className="flex-1 max-w-xs px-3 py-1 rounded-md bg-background border border-input text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMute(track.id)}
                    className={track.muted ? 'bg-red-500/20' : ''}
                  >
                    M
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSolo(track.id)}
                    className={track.solo ? 'bg-yellow-500/20' : ''}
                  >
                    S
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(track.id, file);
                    }}
                    className="hidden"
                    id={`upload-${track.id}`}
                  />
                  <label htmlFor={`upload-${track.id}`}>
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      <Edit2 className="mr-2 h-3 w-3" />
                      Load
                    </Button>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startRecording(track.id)}
                    disabled={isRecording}
                  >
                    <Mic className="mr-2 h-3 w-3" />
                    Record
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTrack(track.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                    <Volume2 className="h-3 w-3" />
                    Volume: {(track.volume * 100).toFixed(0)}%
                  </label>
                  <Slider
                    value={[track.volume]}
                    onValueChange={(v) => updateTrackVolume(track.id, v[0])}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Pan: {track.pan > 0 ? 'R' : track.pan < 0 ? 'L' : 'C'} {Math.abs(track.pan * 100).toFixed(0)}
                  </label>
                  <Slider
                    value={[track.pan]}
                    onValueChange={(v) => updateTrackPan(track.id, v[0])}
                    min={-1}
                    max={1}
                    step={0.01}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {tracks.length === 0 && (
        <Card className="p-12 bg-card/50 backdrop-blur border-primary/20">
          <div className="text-center space-y-4">
            <Plus className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">No tracks yet</p>
              <p className="text-sm text-muted-foreground">Add a track to get started</p>
            </div>
            <Button onClick={addTrack}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Track
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
