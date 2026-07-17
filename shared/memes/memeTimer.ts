/**
 * Per-region meme playback timer.
 *
 * A `meme-surface` region may carry its own timer that OVERRIDES the global
 * `config.memeSettings` duration, so hosts can tune "how long a meme stays" right
 * where they assign the surface:
 *
 *   undefined → use the global default settings unchanged
 *   'hold'    → play until the next meme / explicit CLEAR (ignores duration)
 *   <number>  → auto-clear after that many seconds
 */
import {
  MEME_MAX_DURATION_SECONDS,
  MEME_MIN_DURATION_SECONDS,
  type MemeSettings,
} from './types';

export type MemeTimer = number | 'hold';

/** Second presets offered in the region content settings dropdown. */
export const MEME_TIMER_SECONDS_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

/** Coerce untrusted persisted/IPC input into a valid MemeTimer (or undefined). */
export function sanitizeMemeTimer(raw: unknown): MemeTimer | undefined {
  if (raw === 'hold') return 'hold';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(MEME_MAX_DURATION_SECONDS, Math.max(MEME_MIN_DURATION_SECONDS, Math.round(n)));
}

/** Merge a per-region timer override onto the global meme settings. */
export function applyMemeTimer(base: MemeSettings, timer: MemeTimer | undefined): MemeSettings {
  if (timer === undefined) return base;
  if (timer === 'hold') {
    return { ...base, playIndefinitely: true };
  }
  return { ...base, playIndefinitely: false, durationSeconds: timer };
}
