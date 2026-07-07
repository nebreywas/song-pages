import type { AlareLyricLine } from './types';

/** Visual gap between major sections — fraction of one lyric line height. */
export const ALARE_BLOCK_GAP_LINE_RATIO = 0.55;

export function alareBlockGapPx(lineHeightPx: number): number {
  return lineHeightPx * ALARE_BLOCK_GAP_LINE_RATIO;
}

/** True when this line starts a new blank-line-separated block (not the first). */
export function alareLineStartsBlock(lineIndex: number, line: AlareLyricLine): boolean {
  return lineIndex > 0 && line.lineIndexInBlock === 0;
}

/** Scroll distance for one line-to-line step; includes block gap when the next line starts a section. */
function alareLineStepPx(
  lines: AlareLyricLine[],
  fromLineIndex: number,
  lineSlotHeightPx: number,
  blockGapPx: number,
): number {
  const next = lines[fromLineIndex + 1];
  const gap = next && next.lineIndexInBlock === 0 ? blockGapPx : 0;
  return lineSlotHeightPx + gap;
}

/**
 * Pixel offset from track top to scroll focus for fractional line position.
 * Block gaps are spread across the transition into a new section so scroll
 * does not hop at integer line boundaries.
 */
export function alareScrollOffsetPx(
  scrollLinePosition: number,
  lines: AlareLyricLine[],
  lineSlotHeightPx: number,
  blockGapPx: number,
): number {
  if (lines.length === 0) return 0;

  const clamped = Math.max(0, Math.min(lines.length - 1, scrollLinePosition));
  const wholeLines = Math.floor(clamped);
  const fraction = clamped - wholeLines;

  let offset = 0;
  for (let i = 0; i < wholeLines; i++) {
    offset += alareLineStepPx(lines, i, lineSlotHeightPx, blockGapPx);
  }

  if (wholeLines >= lines.length - 1) return offset;

  return offset + fraction * alareLineStepPx(lines, wholeLines, lineSlotHeightPx, blockGapPx);
}
