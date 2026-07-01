import { useEffect, useRef } from 'react';

import type { VisualizerFrameProps } from '../types';

/** Subtle cover-art pulse with a small spectrum ring — embedded panel only. */
export function CoverPulseVisualizer({
  frequencyData,
  width,
  height,
  isPlaying,
  song,
  frame,
}: VisualizerFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!song?.coverUrl) {
      coverRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = song.coverUrl;
    img.onload = () => {
      coverRef.current = img;
    };
    return () => {
      coverRef.current = null;
    };
  }, [song?.coverUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, width, height);

    const bass =
      frequencyData.slice(0, 8).reduce((sum, value) => sum + value, 0) / (8 * 255);
    const pulse = isPlaying ? 1 + bass * 0.12 : 1;
    const size = Math.min(width, height) * 0.42 * pulse;
    const cx = width / 2;
    const cy = height * 0.42;

    if (coverRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(coverRef.current, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1a2438';
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const ringCount = 24;
    for (let i = 0; i < ringCount; i += 1) {
      const value = frequencyData[i * 4] / 255;
      const angle = (i / ringCount) * Math.PI * 2 - Math.PI / 2;
      const inner = size / 2 + 8;
      const outer = inner + 6 + value * 22;
      ctx.strokeStyle = `rgba(110, 168, 255, ${0.35 + value * 0.55})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    if (song?.title) {
      ctx.fillStyle = '#e8ecf4';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(song.title, cx, height - 36);
      if (song.artist) {
        ctx.fillStyle = '#8b95a8';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(song.artist, cx, height - 16);
      }
    }
  }, [frame, frequencyData, height, isPlaying, song, width]);

  return <canvas ref={canvasRef} className="visualizer-canvas" aria-hidden="true" />;
}
