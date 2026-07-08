import { segmentGraphemes } from './graphemes';
import { isEmojiGrapheme } from './phraseSegments';

/** Peak CSS scale applied during intro — sizing must reserve this headroom. */
export function peakTextEffectScale(effectId: string): number {
  switch (effectId) {
    case 'slam':
      return 2.4;
    case 'stamp':
      return 2.2;
    case 'balloon':
      return 1.08;
    case 'zoom':
      return 1.05;
    default:
      return 1;
  }
}

/** Rough em-width for uppercase display fonts + OS emoji (tuned for Impact-style caps). */
export function estimatePhraseWidthEm(phrase: string): number {
  const graphemes = segmentGraphemes(phrase);
  if (graphemes.length === 0) return 1;

  return graphemes.reduce((sum, grapheme) => {
    return sum + (isEmojiGrapheme(grapheme) ? 1.12 : 0.66);
  }, 0);
}

/**
 * Responsive phrase size that uses most of the surface width without clipping
 * during scale-based intro effects (Slam, Balloon).
 */
export function kudoTextFontSizePx(containerWidth: number, phrase: string, effectId: string): number {
  if (containerWidth <= 0) return 48;

  const usableWidth = containerWidth * 0.96;
  const peakScale = peakTextEffectScale(effectId);
  const widthEm = Math.max(estimatePhraseWidthEm(phrase), 1);
  const letterSpacingPad = 1.06;

  const fitCap = usableWidth / (widthEm * letterSpacingPad * peakScale);
  const viewportIdeal = Math.min(128, Math.max(28, containerWidth * 0.1));

  return Math.max(22, Math.round(Math.min(viewportIdeal, fitCap)));
}
