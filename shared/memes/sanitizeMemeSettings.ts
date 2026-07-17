/**
 * Coerce untrusted persisted/IPC input into a valid MemeSettings object.
 * Kept separate from types.ts so it can be reused by config normalization
 * (shared/vcModeTypes.ts) and by the IPC boundary.
 */
import {
  DEFAULT_MEME_SETTINGS,
  MEME_MAX_DURATION_SECONDS,
  MEME_MAX_ROUNDTRIPS,
  MEME_MIN_DURATION_SECONDS,
  type MemeSettings,
} from './types';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeMemeSettings(raw: unknown): MemeSettings {
  const value = raw && typeof raw === 'object' ? (raw as Partial<MemeSettings>) : {};
  return {
    // Defaults preserve "click clears" + a short timed play, matching the
    // common listening-party flow (pop a meme, it clears itself).
    clickClears: value.clickClears !== false,
    playIndefinitely: value.playIndefinitely === true,
    durationSeconds: clampInt(
      value.durationSeconds,
      MEME_MIN_DURATION_SECONDS,
      MEME_MAX_DURATION_SECONDS,
      DEFAULT_MEME_SETTINGS.durationSeconds,
    ),
    minRoundtrips: clampInt(value.minRoundtrips, 0, MEME_MAX_ROUNDTRIPS, DEFAULT_MEME_SETTINGS.minRoundtrips),
    clearAfterCycle: value.clearAfterCycle !== false,
  };
}
