/**
 * Centralized ALARE timing coefficients — tune during calibration (ALARE §17.3).
 */

/** Fraction of total duration held before first line activates. */
export const ALARE_INTRO_RESERVE_PCT = 0.04;

/** Fraction of total duration held after last line completes. */
export const ALARE_OUTRO_RESERVE_PCT = 0.03;

/** Pause between blank-line blocks when density allows (seconds). */
export const ALARE_BLOCK_GAP_SEC = 0.45;

/** Minimum seconds allocated to any non-empty line. */
export const ALARE_MIN_LINE_DURATION_SEC = 0.35;

export const ALARE_TIMING_WEIGHT = {
  baseLine: 1,
  perCharacter: 0.02,
  perWord: 0.35,
  perSyllable: 0.25,
} as const;

/** Playback duration must differ from manifest by this fraction to prefer playback. */
export const ALARE_DURATION_DISAGREE_RATIO = 0.05;
