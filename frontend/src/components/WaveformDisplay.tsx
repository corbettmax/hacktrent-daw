import { useEffect, useRef } from 'react';
import type { SynthEngine } from '../lib/synthEngine';

interface WaveformDisplayProps {
  synthEngine: SynthEngine | null;
}

export default function WaveformDisplay({ synthEngine }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!synthEngine || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const waveformData = synthEngine.getWaveformData();
      
      // Set canvas size
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, 'oklch(0.15 0 0)');
      gradient.addColorStop(1, 'oklch(0.2 0 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw grid
      ctx.strokeStyle = 'oklch(0.3 0 0 / 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (rect.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }

      // Draw waveform
      ctx.beginPath();
      ctx.strokeStyle = 'oklch(0.7 0.2 264)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'oklch(0.7 0.2 264 / 0.5)';

      const sliceWidth = rect.width / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128.0;
        const y = (v * rect.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [synthEngine]);

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border/50">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
