import { useEffect, useRef } from 'react';
import type { SynthEngine } from '../lib/synthEngine';

interface WaveformDisplayProps {
  synthEngine?: SynthEngine | null;
  audioBuffer?: AudioBuffer | null;
}

export default function WaveformDisplay({ synthEngine, audioBuffer }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Static waveform drawing for AudioBuffer
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current || synthEngine) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
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

      // Draw waveform from AudioBuffer
      const data = audioBuffer.getChannelData(0);
      ctx.beginPath();
      ctx.strokeStyle = 'oklch(0.7 0.2 264)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'oklch(0.7 0.2 264 / 0.5)';

      const step = Math.ceil(data.length / rect.width);
      const amp = rect.height / 2;

      for (let i = 0; i < rect.width; i++) {
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
      ctx.shadowBlur = 0;
    };

    draw();
  }, [audioBuffer, synthEngine]);

  // Animated waveform for SynthEngine
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
