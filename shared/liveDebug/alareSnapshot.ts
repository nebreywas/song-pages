/**
 * ALARE section of Live Debug — values published from the VC scroll view.
 *
 * Trim is NOT a continuous speed multiplier. Live scroll uses accumulated
 * line-index drift (`nudge × avgLinesPerSec`). Keep HUD labels honest to that.
 */

export type AlareLiveDebugSnapshot = {
  /** True while an ALARE multi-line lyrics cell is mounted and has a timeline. */
  active: boolean;
  songId: string | null;
  /** Current speed trim fraction (−0.5 … +0.5). Resets to 0 on song change. */
  nudge: number;
  /** Nudge expressed as host press steps (±10 max). */
  nudgeSteps: number;
  /** Average line advance of the locked timeline (lines / duration). */
  baseLinesPerSec: number;
  /**
   * Extra line-index velocity from trim: `nudge × baseLinesPerSec`.
   * Positive = slowly lead ahead of the wall-clock timeline; not “% faster scroll.”
   */
  driftLinesPerSec: number;
  /** Accumulated extra line-index from the live velocity trim. */
  nudgeLineOffset: number;
  /** Smoothed scroll line position currently driving the view. */
  scrollLinePosition: number;
  /** Last timeline line index — offset is capped here for display. */
  maxLineIndex: number;
  /**
   * True when base+offset was clamped to [0, maxLine] this publish —
   * offset can keep growing while the track visually sticks at an edge.
   */
  scrollClamped: boolean;
  densityPressure: number | null;
  durationSource: string | null;
  updatedAt: number;
};

export const EMPTY_ALARE_LIVE_DEBUG: AlareLiveDebugSnapshot = {
  active: false,
  songId: null,
  nudge: 0,
  nudgeSteps: 0,
  baseLinesPerSec: 0,
  driftLinesPerSec: 0,
  nudgeLineOffset: 0,
  scrollLinePosition: 0,
  maxLineIndex: 0,
  scrollClamped: false,
  densityPressure: null,
  durationSource: null,
  updatedAt: 0,
};
