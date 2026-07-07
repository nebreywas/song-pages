import { ALARE_DURATION_DISAGREE_RATIO } from './constants';

export type TrackDurationSource = 'manifest' | 'playback';

export type ResolvedTrackDuration = {
  seconds: number;
  source: TrackDurationSource;
};

function finitePositive(seconds: number | null | undefined): number | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

/**
 * Single duration entry point for ALARE (ALARE §7.5, §22).
 * Manifest first when valid; playback when manifest missing or materially wrong.
 */
export function resolveTrackDuration(
  manifestDurationSeconds: number | null | undefined,
  playbackDurationSeconds: number,
): ResolvedTrackDuration {
  const manifest = finitePositive(manifestDurationSeconds);
  const playback = finitePositive(playbackDurationSeconds);

  if (manifest != null && playback != null) {
    const ratio = Math.abs(playback - manifest) / manifest;
    if (ratio > ALARE_DURATION_DISAGREE_RATIO) {
      return { seconds: playback, source: 'playback' };
    }
    return { seconds: manifest, source: 'manifest' };
  }

  if (manifest != null) return { seconds: manifest, source: 'manifest' };
  if (playback != null) return { seconds: playback, source: 'playback' };
  return { seconds: 0, source: 'manifest' };
}
