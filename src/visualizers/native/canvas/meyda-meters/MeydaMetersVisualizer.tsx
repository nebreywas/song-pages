/**
 * Meyda Meters — labeled band + feel meters from AnalyserBus FFT.
 * Same pipeline spirit as Spectrum bars, but Meyda-lab vocabulary (bass share, loudness proxy, etc.).
 */

import { useEffect, useRef } from 'react';

import { meterSharesFromFrequency } from '../../../../audio/meydaLab/meterShares';
import type { VisualizerFrameProps } from '../../../core/types';

type MeterRow = {
  id: string;
  label: string;
  value: number;
  color: [string, string];
};

function brightnessFromSpectrum(frequencyData: Uint8Array): number {
  // Spectral "centroid" proxy: weighted bin index → 0–1.
  let weighted = 0;
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i += 1) {
    const v = frequencyData[i] ?? 0;
    weighted += i * v;
    sum += v;
  }
  if (sum <= 0) return 0;
  return Math.min(1, weighted / sum / Math.max(1, frequencyData.length - 1));
}

function noisinessFromSpectrum(frequencyData: Uint8Array): number {
  // Flatness-ish: how evenly energy is spread (high = noise / wash).
  let geometric = 0;
  let arithmetic = 0;
  let count = 0;
  for (let i = 0; i < frequencyData.length; i += 1) {
    const v = Math.max(1e-6, (frequencyData[i] ?? 0) / 255);
    geometric += Math.log(v);
    arithmetic += v;
    count += 1;
  }
  if (count === 0) return 0;
  const g = Math.exp(geometric / count);
  const a = arithmetic / count;
  return Math.min(1, g / Math.max(1e-6, a));
}

/** Canvas meter bank driven by the same analysis language as Meyda Lab. */
export function MeydaMetersVisualizer({
  frequencyData,
  width,
  height,
  isPlaying,
  frame,
  settings,
}: VisualizerFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sensitivity = typeof settings.sensitivity === 'number' ? settings.sensitivity : 1;
  const showFeel = settings.showFeel !== false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#07060f';
    ctx.fillRect(0, 0, width, height);

    const silent = !isPlaying && frequencyData.every((v) => v === 0);
    if (silent) {
      ctx.fillStyle = 'rgba(200, 190, 220, 0.55)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Play a song — Meyda-style meters', width / 2, height / 2);
      return;
    }

    const shares = meterSharesFromFrequency(frequencyData);
    const rows: MeterRow[] = [
      {
        id: 'bass',
        label: 'Bass share',
        value: Math.min(1, shares.bassShare * sensitivity),
        color: ['#5b8cff', '#9b6bff'],
      },
      {
        id: 'mid',
        label: 'Mid share',
        value: Math.min(1, shares.midShare * sensitivity),
        color: ['#6bcf8e', '#c9e265'],
      },
      {
        id: 'treble',
        label: 'Treble share',
        value: Math.min(1, shares.trebleShare * sensitivity),
        color: ['#ff9de2', '#ffd27a'],
      },
      {
        id: 'level',
        label: 'Level (overall)',
        value: Math.min(1, shares.overall * sensitivity * 1.4),
        color: ['#c9a0ff', '#ff6eb4'],
      },
    ];

    if (showFeel) {
      rows.push(
        {
          id: 'bright',
          label: 'Brightness',
          value: Math.min(1, brightnessFromSpectrum(frequencyData) * sensitivity),
          color: ['#ffe08a', '#ff9de2'],
        },
        {
          id: 'noise',
          label: 'Noisiness',
          value: Math.min(1, noisinessFromSpectrum(frequencyData) * sensitivity),
          color: ['#8ab4ff', '#6ea8ff'],
        },
      );
    }

    const padX = Math.max(16, width * 0.06);
    const padY = Math.max(20, height * 0.08);
    const rowH = (height - padY * 2) / rows.length;
    const trackH = Math.min(18, rowH * 0.28);
    const labelW = Math.min(140, width * 0.28);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    rows.forEach((row, i) => {
      const y = padY + i * rowH + rowH * 0.45;
      ctx.fillStyle = 'rgba(232, 220, 255, 0.85)';
      ctx.font = `600 ${Math.max(11, Math.min(15, rowH * 0.28))}px system-ui, sans-serif`;
      ctx.fillText(row.label, padX, y);

      const trackX = padX + labelW;
      const trackW = Math.max(40, width - padX - trackX);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      roundRect(ctx, trackX, y - trackH / 2, trackW, trackH, 4);
      ctx.fill();

      const fillW = Math.max(2, trackW * row.value);
      const grad = ctx.createLinearGradient(trackX, 0, trackX + fillW, 0);
      grad.addColorStop(0, row.color[0]!);
      grad.addColorStop(1, row.color[1]!);
      ctx.fillStyle = grad;
      roundRect(ctx, trackX, y - trackH / 2, fillW, trackH, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(232, 220, 255, 0.55)';
      ctx.font = `500 ${Math.max(10, Math.min(13, rowH * 0.22))}px ui-monospace, monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(row.value * 100)}%`, trackX + trackW, y - trackH / 2 - 8);
      ctx.textAlign = 'left';
    });
  }, [frame, frequencyData, height, isPlaying, sensitivity, showFeel, width]);

  return <canvas ref={canvasRef} className="visualizer-canvas" aria-hidden="true" />;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
