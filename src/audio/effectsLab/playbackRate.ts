/**
 * Coupled speed+pitch (HTMLMediaElement.playbackRate) — DJ/fun feel.
 * Permanent hold lives in Effects Lab state; bursts are performance pads.
 */

export const PLAYBACK_RATE_HOLD_MIN = 0.7;
export const PLAYBACK_RATE_HOLD_MAX = 1.35;
export const PLAYBACK_RATE_HOLD_DEFAULT = 1;

/** Discrete quick-set amounts for the hold control. */
export const PLAYBACK_RATE_HOLD_PRESETS = [
  { label: 'Slow', rate: 0.85 },
  { label: 'Normal', rate: 1 },
  { label: 'Fast', rate: 1.2 },
] as const;

export type PlaybackRateEasing = 'linear' | 'ease-out' | 'ease-in-out';

export function clampPlaybackRateHold(rate: unknown): number {
  const n = typeof rate === 'number' ? rate : Number(rate);
  if (!Number.isFinite(n)) return PLAYBACK_RATE_HOLD_DEFAULT;
  return Math.min(PLAYBACK_RATE_HOLD_MAX, Math.max(PLAYBACK_RATE_HOLD_MIN, n));
}

export function isPlaybackRateHoldActive(rate: number): boolean {
  return Math.abs(clampPlaybackRateHold(rate) - PLAYBACK_RATE_HOLD_DEFAULT) >= 0.01;
}

/** Apply coupled rate on a media element (safe no-op if unavailable). */
export function applyElementPlaybackRate(
  audio: HTMLMediaElement | null | undefined,
  rate: number,
): void {
  if (!audio) return;
  const next = clampPlaybackRateHold(rate);
  if (Math.abs(audio.playbackRate - next) < 0.001) return;
  try {
    audio.playbackRate = next;
  } catch {
    // Element may reject rates before metadata is ready.
  }
}

export function applyElementPlaybackRateMany(
  audios: Array<HTMLMediaElement | null | undefined>,
  rate: number,
): void {
  for (const audio of audios) {
    applyElementPlaybackRate(audio, rate);
  }
}

export function easePlaybackRate(t: number, easing: PlaybackRateEasing): number {
  const x = Math.min(1, Math.max(0, t));
  switch (easing) {
    case 'linear':
      return x;
    case 'ease-out':
      return 1 - Math.pow(1 - x, 3);
    case 'ease-in-out':
    default:
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}

export function lerpPlaybackRate(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
