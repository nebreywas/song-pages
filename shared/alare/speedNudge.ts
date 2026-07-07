/** Per-press adjustment to ALARE scroll speed (fraction of playback time). */
export const ALARE_SPEED_NUDGE_STEP = 0.025;

/** Max presses of +/- allowed in each direction while a song plays. */
export const ALARE_SPEED_NUDGE_MAX_STEPS = 10;

/** Max cumulative nudge — {@link ALARE_SPEED_NUDGE_MAX_STEPS} presses at {@link ALARE_SPEED_NUDGE_STEP}. */
export const ALARE_SPEED_NUDGE_MAX = ALARE_SPEED_NUDGE_STEP * ALARE_SPEED_NUDGE_MAX_STEPS;

export function clampAlareSpeedNudge(nudge: number): number {
  if (!Number.isFinite(nudge)) return 0;
  return Math.min(ALARE_SPEED_NUDGE_MAX, Math.max(-ALARE_SPEED_NUDGE_MAX, nudge));
}

/**
 * Map wall-clock playback time to ALARE scroll time.
 * Positive nudge scrolls lyrics slightly ahead; negative lags behind.
 * Anchored at t=0 so song start stays aligned.
 */
export function applyAlareSpeedNudge(
  playbackTimeSec: number,
  nudge: number,
  durationSec: number,
): number {
  if (nudge === 0 || playbackTimeSec <= 0) return playbackTimeSec;
  const adjusted = playbackTimeSec * (1 + nudge);
  if (durationSec > 0) return Math.min(adjusted, durationSec);
  return adjusted;
}

/** Average lyric-line advance rate for a built timeline (lines per second). */
export function alareLinesPerSecond(timeline: { lines: unknown[]; totalDuration: number }): number {
  return timeline.lines.length / Math.max(timeline.totalDuration, 1);
}

/**
 * Accumulate extra line-index offset from a live speed nudge.
 * Survives timeline metadata churn — nudge is velocity, not a one-time time remap.
 */
export function accumulateAlareSpeedNudgeLines(
  offsetLines: number,
  deltaSec: number,
  nudge: number,
  linesPerSecond: number,
): number {
  if (nudge === 0 || deltaSec <= 0 || linesPerSecond <= 0) return offsetLines;
  return offsetLines + deltaSec * nudge * linesPerSecond;
}
