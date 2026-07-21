/**
 * Listener Zen Mode timing rules.
 *
 * The silence duration is chosen once when an interlude begins, then retained
 * for the title and seek-bar duration so the interlude behaves like a tiny
 * pseudo-track instead of a shifting countdown.
 */
export const ZEN_SONG_INTERVAL = 3;
export const ZEN_MIN_SILENCE_SECONDS = 5;
export const ZEN_MAX_SILENCE_SECONDS = 20;

/** Pick an inclusive whole-second duration from the configured Zen range. */
export function pickZenSilenceSeconds(random: () => number = Math.random): number {
  const unit = Math.min(0.999999999999, Math.max(0, random()));
  return (
    ZEN_MIN_SILENCE_SECONDS +
    Math.floor(unit * (ZEN_MAX_SILENCE_SECONDS - ZEN_MIN_SILENCE_SECONDS + 1))
  );
}

/** True when the completed-song count has reached the next Zen interval. */
export function shouldStartZenInterlude(completedSongCount: number): boolean {
  return completedSongCount > 0 && completedSongCount % ZEN_SONG_INTERVAL === 0;
}
