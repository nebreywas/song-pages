/** Grapheme-safe emoji handling for Kudo particle elements (spec §3.2). */

/** Split a string into user-perceived graphemes without trimming (preserves spaces while typing). */
export function segmentGraphemes(value: string): string[] {
  if (!value) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...segmenter.segment(value)].map((part) => part.segment);
  }

  return Array.from(value);
}

/** True when the string is exactly one visible grapheme (one emoji slot). */
export function isSingleGrapheme(value: string): boolean {
  return segmentGraphemes(value.trim()).length === 1;
}

/** Keep the first grapheme from user input for a single emoji slot. */
export function firstGrapheme(value: string): string | null {
  const graphemes = segmentGraphemes(value.trim());
  return graphemes[0] ?? null;
}

/** Grapheme count for Kudo text limits (spec §3.3). */
export function countGraphemes(value: string): number {
  return segmentGraphemes(value).length;
}

/** Truncate to max graphemes without splitting emoji sequences. */
export function truncateToMaxGraphemes(value: string, max: number): string {
  const graphemes = segmentGraphemes(value);
  return graphemes.slice(0, max).join('');
}

/** Normalize 1–4 emoji element strings for particle presets. */
export function sanitizeEmojiElements(raw: unknown, max = 4): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const grapheme = firstGrapheme(entry);
    if (!grapheme) continue;
    out.push(grapheme);
    if (out.length >= max) break;
  }
  return out;
}
