/**
 * VC Mode WaveSurfer cell — decodes waveform peaks from the mirrored playback URL
 * while the main (or VC mirror) player owns audible transport. Progress is driven
 * from VcPlaybackState via setTime so we never start a second audible stream.
 */

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/plugins/spectrogram';

import type { EffectiveWavesurferPresentation } from '@shared/vcMode/assignmentSettings';
import { isWavesurferDecodableUrl } from '@shared/vcMode/wavesurferSettings';
import type { VcPlaybackState } from '@shared/vcModeTypes';

type VcWavesurferViewProps = {
  presentation: EffectiveWavesurferPresentation;
  playback: VcPlaybackState;
  /** Direct audio URL from audioMirror — HLS is rejected (peaks need progressive media). */
  playbackUrl?: string | null;
  /** Designer preview can pass static peaks when no URL is available. */
  previewPeaks?: number[] | number[][];
  previewDuration?: number;
};

const WAVE_COLOR = '#7eb8da';
const PROGRESS_COLOR = '#f5c26b';
const GRADIENT_WAVE: string[] = ['#ff6b35', '#f7c948', '#4ecdc4', '#5b9fd4'];

/** Synthetic demo peaks for the VC designer when no track URL is loaded. */
export function buildDesignerWavesurferPeaks(samples = 256): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / samples;
    const envelope = Math.sin(Math.PI * t) * (0.35 + 0.65 * Math.abs(Math.sin(t * 18)));
    peaks.push(envelope);
  }
  return peaks;
}

/** Stable reference so designer remounts do not thrash WaveSurfer.create. */
export const DESIGNER_WAVESURFER_PEAKS: number[] = buildDesignerWavesurferPeaks();

/** Squiggly custom stroke — mirrors the wavesurfer.xyz custom-render example. */
function squigglyRender(
  channels: Array<Float32Array | number[]>,
  ctx: CanvasRenderingContext2D,
): void {
  const channel = channels[0];
  if (!channel) return;
  const { width, height } = ctx.canvas;
  const scale = channel.length / width;
  ctx.translate(0, height / 2);
  ctx.strokeStyle = typeof ctx.fillStyle === 'string' ? ctx.fillStyle : WAVE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < width; x += 2) {
    const index = Math.floor(x * scale);
    const value = Math.abs(channel[index] ?? 0);
    const y = Math.sin(x / 8) * value * height * 0.48;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function VcWavesurferView({
  presentation,
  playback,
  playbackUrl = null,
  previewPeaks,
  previewDuration = 30,
}: VcWavesurferViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);

  const decodableUrl = isWavesurferDecodableUrl(playbackUrl) ? playbackUrl!.trim() : null;
  const usePreviewPeaks = !decodableUrl && Boolean(previewPeaks?.length);
  // HLS / YouTube / SoundCloud — no peaks URL; omit entirely (designer still uses previewPeaks).
  const canRender = Boolean(decodableUrl || usePreviewPeaks);

  useEffect(() => {
    const container = containerRef.current;
    if (!canRender || !container) {
      setReady(false);
      return;
    }

    setReady(false);
    let destroyed = false;
    const { viewMode, barWidth, barGap, paintProgress } = presentation;

    const waveColor = viewMode === 'gradient' ? GRADIENT_WAVE : WAVE_COLOR;
    const progressColor = paintProgress ? PROGRESS_COLOR : waveColor;

    const plugins =
      viewMode === 'spectrogram'
        ? [
            Spectrogram.create({
              labels: false,
              height: 120,
              splitChannels: false,
            }),
          ]
        : [];

    const ws = WaveSurfer.create({
      container,
      height: viewMode === 'spectrogram' ? 0 : 'auto',
      waveColor,
      progressColor,
      cursorWidth: 0,
      interact: false,
      hideScrollbar: true,
      normalize: true,
      barWidth: viewMode === 'barwave' ? barWidth : undefined,
      barGap: viewMode === 'barwave' ? barGap : undefined,
      barRadius: viewMode === 'barwave' ? 2 : undefined,
      renderFunction: viewMode === 'squiggly' ? squigglyRender : undefined,
      plugins,
      // Mute — the VC audio mirror / main player owns sound.
      volume: 0,
    });
    wsRef.current = ws;

    const onReady = () => {
      if (destroyed) return;
      setReady(true);
      if (playback.duration > 0 || playback.currentTime > 0) {
        try {
          ws.setTime(playback.currentTime);
        } catch {
          /* ignore until fully ready */
        }
      }
    };
    // Decode failures stay invisible — no warning over VC.
    const onError = () => {
      if (!destroyed) setReady(false);
    };

    ws.on('ready', onReady);
    ws.on('error', onError);

    if (decodableUrl) {
      void ws.load(decodableUrl);
    } else if (previewPeaks) {
      void ws.load('', previewPeaks, previewDuration);
    }

    return () => {
      destroyed = true;
      ws.un('ready', onReady);
      ws.un('error', onError);
      ws.destroy();
      if (wsRef.current === ws) wsRef.current = null;
    };
    // Recreate when URL or view presentation changes — not on every time tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playback clock handled below
  }, [
    canRender,
    decodableUrl,
    usePreviewPeaks,
    previewPeaks,
    previewDuration,
    presentation.viewMode,
    presentation.barWidth,
    presentation.barGap,
    presentation.paintProgress,
  ]);

  // Paint progress from the shared VC playback clock (no second audible stream).
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !presentation.paintProgress || !ready) return;
    if (!(playback.duration > 0) && !(playback.currentTime > 0)) return;
    try {
      ws.setTime(playback.currentTime);
    } catch {
      /* WaveSurfer may throw if destroyed mid-tick */
    }
  }, [playback.currentTime, playback.duration, presentation.paintProgress, ready]);

  if (!canRender) return null;

  return (
    <div
      className={`vc-wavesurfer-shell${ready ? ' is-ready' : ''}`}
      aria-hidden={!ready}
    >
      <div ref={containerRef} className="vc-wavesurfer-host" />
    </div>
  );
}
