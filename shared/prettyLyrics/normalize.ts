/**
 * Source normalization for analysis vs display.
 * raw is rendered; normalized is analyzed — never rewrite display text silently.
 */

export type NormalizedToken = {
  raw: string;
  normalized: string;
  isWord: boolean;
};

/** Normalize line endings and Unicode; keep original line boundaries. */
export function normalizeLineEndings(text: string): string {
  return text.normalize('NFC').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** True when a line is only [bracket metadata] (with optional whitespace). */
export function isBracketMetadataLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^\[[^\]]*\]$/.test(trimmed);
}

/**
 * Analysis key for a line or phrase: lowercase, collapse ws, strip peripheral punctuation,
 * keep apostrophes and hyphens inside words.
 */
export function normalizeForAnalysis(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}'\-\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a raw line into display tokens (words + whitespace/punctuation separators). */
export function tokenizeRawLine(rawLine: string): NormalizedToken[] {
  const parts = rawLine.split(/(\s+|[,.!?;:"()\[\]{}…]+)/);
  const out: NormalizedToken[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part) || /^[,.!?;:"()\[\]{}…]+$/.test(part)) {
      out.push({ raw: part, normalized: '', isWord: false });
      continue;
    }
    const normalized = normalizeForAnalysis(part);
    out.push({ raw: part, normalized, isWord: normalized.length > 0 });
  }
  return out;
}

/** Rough syllable estimate for density layout (not musical syllables-per-beat). */
export function estimateSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}
