import { MARQUEE_ALARE_LEAD_IN_RATIO } from './constants';
import type { MarqueeLyricsLayout } from './layout';

/**
 * Map ALARE fractional line position to horizontal scroll offset in pixels.
 * Separate from vertical ALARE math — marquee uses character positions in the flat line.
 */
export function resolveMarqueeAlareScrollPx(
  scrollLinePosition: number,
  layout: MarqueeLyricsLayout,
  textWidth: number,
  viewportWidth: number,
): number {
  if (layout.text.length === 0 || layout.lineCharStarts.length === 0) return 0;

  const lastLine = layout.lineCharStarts.length - 1;
  const clamped = Math.max(0, Math.min(scrollLinePosition, lastLine));
  const lineIndex = Math.floor(clamped);
  const frac = clamped - lineIndex;

  const charStart = layout.lineCharStarts[lineIndex] ?? 0;
  const charEnd = layout.lineCharStarts[lineIndex + 1] ?? layout.text.length;
  const charPos = charStart + frac * Math.max(1, charEnd - charStart);
  const charRatio = charPos / layout.text.length;

  const focusPx = charRatio * textWidth;
  const leadIn = viewportWidth * MARQUEE_ALARE_LEAD_IN_RATIO;
  const maxScroll = Math.max(0, textWidth - viewportWidth);
  return -Math.min(maxScroll, Math.max(0, focusPx - leadIn));
}
