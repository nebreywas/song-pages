import { useEffect, useRef } from 'react';

import type { VisualizerFrameProps } from '../../../core/types';

type AuroraBlob = {
  x: number;
  y: number;
  radius: number;
  hue: number;
  vx: number;
  vy: number;
};

/** Flowing aurora field — tuned for external projection and VC regions. */
export function AuroraVisualizer({
  frequencyData,
  width,
  height,
  isPlaying,
  context,
  frame,
  settings,
}: VisualizerFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<AuroraBlob[]>([]);
  const song = context.song;
  const speed = typeof settings.speed === 'number' ? settings.speed : 1;

  useEffect(() => {
    blobsRef.current = Array.from({ length: 5 }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 80 + index * 40,
      hue: 200 + index * 30,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
    }));
  }, [height, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = 'rgba(4, 6, 12, 0.28)';
    ctx.fillRect(0, 0, width, height);

    const bass = frequencyData.slice(0, 16).reduce((sum, v) => sum + v, 0) / (16 * 255);
    const mid = frequencyData.slice(16, 80).reduce((sum, v) => sum + v, 0) / (64 * 255);
    const treble = frequencyData.slice(80, 160).reduce((sum, v) => sum + v, 0) / (80 * 255);
    const energy = isPlaying ? bass * 0.5 + mid * 0.35 + treble * 0.15 : 0.05;

    for (const blob of blobsRef.current) {
      blob.x += blob.vx * (1 + energy * 3) * speed;
      blob.y += blob.vy * (1 + energy * 3) * speed;
      if (blob.x < -blob.radius) blob.x = width + blob.radius;
      if (blob.x > width + blob.radius) blob.x = -blob.radius;
      if (blob.y < -blob.radius) blob.y = height + blob.radius;
      if (blob.y > height + blob.radius) blob.y = -blob.radius;

      const radius = blob.radius * (1 + energy * 0.8);
      const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, radius);
      gradient.addColorStop(0, `hsla(${blob.hue + treble * 80}, 85%, 62%, ${0.22 + energy * 0.35})`);
      gradient.addColorStop(1, 'hsla(240, 40%, 12%, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (song?.title) {
      ctx.fillStyle = 'rgba(232, 236, 244, 0.85)';
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(song.title, width / 2, height - 48);
      if (song.artist) {
        ctx.fillStyle = 'rgba(139, 149, 168, 0.9)';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(song.artist, width / 2, height - 22);
      }
    }
  }, [frame, frequencyData, height, isPlaying, song, speed, width]);

  return <canvas ref={canvasRef} className="visualizer-canvas visualizer-canvas-fullscreen" aria-hidden="true" />;
}
