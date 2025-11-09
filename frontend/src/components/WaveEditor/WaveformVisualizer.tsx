import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRef, useEffect, useCallback } from 'react';

interface WaveformVisualizerProps {
  buffer: AudioBuffer | null;
  version?: number;
}

export default function WaveformVisualizer({ buffer, version }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = useCallback((buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('No canvas ref');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('No canvas context');
      return;
    }

    console.log('Drawing waveform, buffer length:', buffer.length);
    const data = buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw waveform
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      const min = Math.min(...Array.from(data.slice(i * step, (i + 1) * step)));
      const max = Math.max(...Array.from(data.slice(i * step, (i + 1) * step)));
      const avg = (min + max) / 2;

      const x = i;
      const y = (1 + avg) * amp;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }, []);

  useEffect(() => {
    console.log('WaveformVisualizer useEffect, buffer:', buffer ? 'exists' : 'null');
    if (buffer) {
      drawWaveform(buffer);
    }
  }, [buffer, drawWaveform]);

  return (
    <Card className="bg-background/50 backdrop-blur border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Waveform Visualizer</CardTitle>
        <p className="text-xs text-muted-foreground">Real-time audio visualization</p>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-[200px] rounded-lg bg-black/40 border border-border/30"
        />
      </CardContent>
    </Card>
  );
}
