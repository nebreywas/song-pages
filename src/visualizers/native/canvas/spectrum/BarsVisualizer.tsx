import { useEffect, useRef } from 'react';

import type { VisualizerFrameProps } from '../../../core/types';

/** Classic mirrored frequency bars — works embedded and fullscreen. */
export function BarsVisualizer({
  frequencyData,
  width,
  height,
  isPlaying,
  frame,
  settings,
}: VisualizerFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sensitivity = typeof settings.sensitivity === 'number' ? settings.sensitivity : 1;
  const mirror = settings.mirror !== false;

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
    const centerY = mirror ? height / 2 : height;

    for (let i = 0; i < barCount; i += 1) {
      const value = Math.min(1, (frequencyData[i * step] / 255) * sensitivity);
      const barHeight = value * (height * (mirror ? 0.42 : 0.82));
      const x = i * barWidth;
      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + (mirror ? barHeight : 0));
      gradient.addColorStop(0, '#6ea8ff');
      gradient.addColorStop(0.5, '#9b7bff');
      gradient.addColorStop(1, '#ff6eb4');
      ctx.fillStyle = gradient;
      ctx.fillRect(
        x + 1,
        mirror ? centerY - barHeight : centerY - barHeight,
        Math.max(1, barWidth - 2),
        mirror ? barHeight * 2 : barHeight,
      );
    }
  }, [frame, frequencyData, height, isPlaying, mirror, sensitivity, width]);

  return <canvas ref={canvasRef} className="visualizer-canvas" aria-hidden="true" />;
}
