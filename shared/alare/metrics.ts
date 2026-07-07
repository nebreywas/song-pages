import { ALARE_TIMING_WEIGHT } from './constants';
import type { ParsedAlareLine } from './parseLyrics';

/** Lightweight syllable estimate — approximate timing signal, not ground truth. */
export function estimateSyllables(text: string): number {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  let total = 0;
  for (const word of words) {
    const groups = word.match(/[aeiouy]+/g);
    let count = groups?.length ?? 1;
    if (word.endsWith('e') && count > 1) count -= 1;
    total += Math.max(1, count);
  }
  return total;
}

export function lineMetrics(line: ParsedAlareLine) {
  const characterCount = line.text.length;
  const wordCount = line.text.split(/\s+/).filter(Boolean).length;
  const estimatedSyllables = estimateSyllables(line.text);
  const timingWeight =
    ALARE_TIMING_WEIGHT.baseLine +
    characterCount * ALARE_TIMING_WEIGHT.perCharacter +
    wordCount * ALARE_TIMING_WEIGHT.perWord +
    estimatedSyllables * ALARE_TIMING_WEIGHT.perSyllable;

  return { characterCount, wordCount, estimatedSyllables, timingWeight };
}
