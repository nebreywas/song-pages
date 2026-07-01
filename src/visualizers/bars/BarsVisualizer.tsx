import { useEffect, useRef } from 'react';

import type { VisualizerFrameProps } from '../types';

/** Classic mirrored frequency bars — works embedded and fullscreen. */
export function BarsVisualizer({
  frequencyData,
  width,
  height,
  isPlaying,
  song,
  frame,
}: VisualizerFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#06080f';
    ctx.fillRect(0, 0, width, height);

    if (!isPlaying && frequencyData.every((v) => v === 0)) {
      ctx.fillStyle = 'rgba(180, 190, 210, 0.55)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Play a song to see the visualizer', width / 2, height / 2);
      return;
    }

    const barCount = Math.min(64, frequencyData.length);
    const step = Math.floor(frequencyData.length / barCount);
    const barWidth = width / barCount;
    const centerY = height / 2;

    for (let i = 0; i < barCount; i += 1) {
      const value = frequencyData[i * step] / 255;
      const barHeight = value * (height * 0.42);
      const x = i * barWidth;
      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
      gradient.addColorStop(0, '#6ea8ff');
      gradient.addColorStop(0.5, '#9b7bff');
      gradient.addColorStop(1, '#ff6eb4');
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, centerY - barHeight, Math.max(1, barWidth - 2), barHeight * 2);
    }
  }, [frame, frequencyData, height, isPlaying, width]);

  return <canvas ref={canvasRef} className="visualizer-canvas" aria-hidden="true" />;
}
