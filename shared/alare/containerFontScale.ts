/**
 * Fit ALARE / Pretty Lyrics base font size to the VC cell.
 * Host font-size is a bias around the fitted size, not a fixed absolute px lock.
 *
 * When Pretty soft-breaks are on, width uses post-break row lengths (so splitting
 * long lines unlocks larger type). Height budgets taller soft-break slots.
 */

import type { HostFontSizeId } from '../hostContent/types';
import { HOST_FONT_SIZE_PX } from '../hostContent/typography';
import {
  SOFT_BREAK_SLOT_HEIGHT_RATIO,
  planPlainLineSoftBreak,
  softBrokenMaxRowChars,
} from '../prettyLyrics/softBreak';

const LINE_HEIGHT_RATIO = 1.35;
/**
 * Conservative average glyph width in em for lyric serifs at display sizes.
 * Underestimating makes type too large in narrow VC columns.
 */
const CHAR_WIDTH_EM = 0.62;
const DEFAULT_TARGET_LINES = 5;
const MIN_FONT_PX = 10;
const MAX_FONT_PX = 96;
const PAD_Y = 28;
/** Horizontal inset: cell padding + room for Pretty center-drift gutter. */
const PAD_X = 40;

export type ResolveAlareContainerFontInput = {
  containerWidth: number;
  containerHeight: number;
  fontSize: HostFontSizeId;
  /** Preferred on-screen line count (ALARE target visible lines). */
  targetVisibleLines?: number;
  /**
   * Characteristic characters per line (prefer ~p90, not mean).
   * Short-line songs otherwise ignore width and size from height alone.
   * Pass pre-soft-break lengths; set softBreakLongLines to re-estimate row widths.
   */
  averageLineChars?: number;
  /**
   * Max relative token/line scale (Pretty anchors). Leave headroom so oversized
   * tokens don’t immediately overflow the fitted slot estimate.
   */
  peakScale?: number;
  /**
   * When true, width fit uses soft-broken row lengths and height fit budgets
   * taller ALARE slots — the size benefit of narrowing long lines.
   */
  softBreakLongLines?: boolean;
  /** Optional lyrics used to recompute characteristic width under soft-breaks. */
  lines?: Array<{ text: string }>;
};

/**
 * Soft bias from Host size ids so medium ≈ 1 and hero doesn’t dominate fit.
 * Power keeps relative steps without 4× explosions at display/hero.
 */
export function alareFontSizeBias(fontSize: HostFontSizeId): number {
  const relative = HOST_FONT_SIZE_PX[fontSize] / HOST_FONT_SIZE_PX.medium;
  return Math.pow(relative, 0.42);
}

export function defaultAlareTargetVisibleLines(target?: number): number {
  if (target == null || !Number.isFinite(target)) return DEFAULT_TARGET_LINES;
  return Math.min(15, Math.max(1, Math.round(target)));
}

/**
 * Prefer upper-tail line length so a few long lines still fit the column.
 * Mean is too optimistic when many lines are one/two words.
 */
export function characteristicLineChars(lines: Array<{ text: string }> | undefined): number {
  if (!lines || lines.length === 0) return 28;
  const lengths = lines.map((line) => line.text.length).sort((a, b) => a - b);
  const idx = Math.min(lengths.length - 1, Math.floor((lengths.length - 1) * 0.9));
  return Math.max(14, lengths[idx] ?? 28);
}

/**
 * p90 of max soft-broken row length — the width budget after soft returns.
 */
export function characteristicSoftBrokenLineChars(
  lines: Array<{ text: string }> | undefined,
): number {
  if (!lines || lines.length === 0) return 18;
  const lengths = lines.map((line) => softBrokenMaxRowChars(line.text)).sort((a, b) => a - b);
  const idx = Math.min(lengths.length - 1, Math.floor((lengths.length - 1) * 0.9));
  return Math.max(10, lengths[idx] ?? 18);
}

/**
 * Average vertical slot units: unbroken lines stay 1×; soft-broken lines pay
 * SOFT_BREAK_SLOT_HEIGHT_RATIO. Avoids punishing the whole poem when only a
 * few long lines split.
 */
export function softBreakAverageSlotUnits(
  lines: Array<{ text: string }> | undefined,
  softBreakLongLines: boolean,
): number {
  if (!softBreakLongLines || !lines || lines.length === 0) return 1;
  let broken = 0;
  for (const line of lines) {
    if (planPlainLineSoftBreak(line.text)) broken += 1;
  }
  const fraction = broken / lines.length;
  return 1 + fraction * (SOFT_BREAK_SLOT_HEIGHT_RATIO - 1);
}

/**
 * Returns a base font px sized for the cell: ~target lines fit vertically,
 * clamp by characteristic line length horizontally, then apply Host size bias.
 */
export function resolveAlareContainerFontPx(input: ResolveAlareContainerFontInput): number {
  const {
    containerWidth,
    containerHeight,
    fontSize,
    targetVisibleLines,
    averageLineChars = 28,
    peakScale = 1,
    softBreakLongLines = false,
    lines,
  } = input;

  const visibleLines = defaultAlareTargetVisibleLines(targetVisibleLines);
  const bias = alareFontSizeBias(fontSize);
  const preferredPx = HOST_FONT_SIZE_PX[fontSize];

  // Before first layout, fall back to the Host absolute size.
  if (containerHeight <= 0 && containerWidth <= 0) {
    return preferredPx;
  }

  const headroom = Math.max(1, Math.min(1.65, peakScale));
  const slotHeightUnits = softBreakAverageSlotUnits(lines, softBreakLongLines);
  const usableH = Math.max(
    0,
    (containerHeight > 0 ? containerHeight : preferredPx * visibleLines * LINE_HEIGHT_RATIO) - PAD_Y,
  );
  const heightFit = usableH / (visibleLines * LINE_HEIGHT_RATIO * headroom * slotHeightUnits);

  const chars = softBreakLongLines
    ? characteristicSoftBrokenLineChars(lines)
    : Math.max(14, averageLineChars);
  const usableW = Math.max(
    0,
    (containerWidth > 0 ? containerWidth : preferredPx * chars * CHAR_WIDTH_EM) - PAD_X,
  );
  const widthFit = usableW / (chars * CHAR_WIDTH_EM);

  // Prefer the stricter of height/width fit; if one axis is unknown, use the other.
  let fitted = preferredPx;
  if (containerHeight > 0 && containerWidth > 0) {
    fitted = Math.min(heightFit, widthFit);
  } else if (containerHeight > 0) {
    fitted = heightFit;
  } else if (containerWidth > 0) {
    fitted = widthFit;
  }

  return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, fitted * bias));
}
