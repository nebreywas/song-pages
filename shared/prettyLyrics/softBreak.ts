/**
 * Soft-break long/dense Pretty Lyrics lines for narrow VC cells.
 *
 * Presentation-only: does not invent ALARE timeline lines. Prefer a nearby
 * comma/semicolon around the midpoint; otherwise break on a mid-sentence word.
 * Related soft-rows use tighter spacing (~10% less) so they read as one line.
 */

import type { TypographyLine, TypographyToken } from './types';

export type SoftBreakPlan = {
  /** Index into `tokens` — first token of the second visual row. */
  breakAtTokenIndex: number;
  reason: 'punctuation' | 'word';
};

/** Soft gap between forced soft-return rows as a fraction of natural inter-line spacing. */
export const SOFT_BREAK_RELATED_SPACING_RATIO = 0.35;

export type SoftBreakOptions = {
  /** Minimum words before considering a break. */
  minWords?: number;
  /** Minimum raw chars before considering a break. */
  minChars?: number;
  /** Also break when Pretty classified the line as dense. */
  breakDenseLayout?: boolean;
  /** How far from the midpoint (0–0.5) to search for punctuation. */
  punctSearchRadius?: number;
};

const DEFAULTS: Required<SoftBreakOptions> = {
  minWords: 8,
  minChars: 42,
  breakDenseLayout: true,
  punctSearchRadius: 0.28,
};

/** Absolute floors — never chop a short line, even if Pretty tags it dense. */
const HARD_MIN_WORDS = 7;
const HARD_MIN_CHARS = 36;
/** Keep both soft-rows readable after a split. */
const MIN_WORDS_PER_ROW = 3;

function wordTokenIndices(tokens: TypographyToken[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i]?.isWord) out.push(i);
  }
  return out;
}

function tokenEndsSoftPunct(token: TypographyToken | undefined): boolean {
  if (!token) return false;
  // Prefer clause breaks — avoid terminal .?! so we don't soft-break after a sentence end mid-display.
  return /[,;:]$/.test(token.rawText.trim());
}

function lineShouldSoftBreak(line: TypographyLine, opts: Required<SoftBreakOptions>): boolean {
  const words = line.features.density.wordCount;
  const chars = line.rawText.trim().length;

  // Hard size floor — dense layout never overrides this.
  if (words < HARD_MIN_WORDS && chars < HARD_MIN_CHARS) return false;

  if (words >= opts.minWords) return true;
  if (chars >= opts.minChars) return true;
  // Dense is only a tie-breaker once the line already clears the hard floor.
  if (opts.breakDenseLayout && line.layout.kind === 'dense') return true;
  return false;
}

/**
 * Find a soft-break token index for a Pretty line, or null if no split.
 * Break index is the first token of the second row (punctuation stays on row 1).
 */
export function planPrettyLineSoftBreak(
  line: TypographyLine,
  options: SoftBreakOptions = {},
): SoftBreakPlan | null {
  const opts = { ...DEFAULTS, ...options };
  if (!lineShouldSoftBreak(line, opts)) return null;

  const tokens = line.tokens;
  if (tokens.length < 4) return null;

  const words = wordTokenIndices(tokens);
  // Require length (words OR chars) for every line — including dense.
  if (words.length < opts.minWords && line.rawText.trim().length < opts.minChars) {
    // Dense + hard floor already passed: still need enough words to form two rows.
    if (words.length < HARD_MIN_WORDS) return null;
  }
  if (words.length < HARD_MIN_WORDS) return null;
  if (words.length < MIN_WORDS_PER_ROW * 2) return null;

  const midWord = Math.floor(words.length / 2);
  const radiusWords = Math.max(1, Math.floor(words.length * opts.punctSearchRadius));

  // Prefer punctuation in a window around the mid word.
  let bestPunct: { tokenIndex: number; dist: number } | null = null;
  for (let w = midWord - radiusWords; w <= midWord + radiusWords; w += 1) {
    if (w < MIN_WORDS_PER_ROW || w > words.length - MIN_WORDS_PER_ROW) continue;
    const wordIdx = words[w]!;
    // Punctuation may be fused to the word token ("love,") or be the next non-word.
    const candidates = [tokens[wordIdx], tokens[wordIdx + 1]];
    for (const cand of candidates) {
      if (!tokenEndsSoftPunct(cand)) continue;
      // Break *after* the punctuated token.
      const breakAt = cand === tokens[wordIdx] ? wordIdx + 1 : wordIdx + 2;
      if (breakAt <= 0 || breakAt >= tokens.length) continue;
      // Skip leading whitespace-only tokens on row 2.
      let at = breakAt;
      while (at < tokens.length && !tokens[at]!.isWord && tokens[at]!.rawText.trim() === '') {
        at += 1;
      }
      if (at <= 0 || at >= tokens.length) continue;
      const wordsBefore = words.filter((idx) => idx < at).length;
      const wordsAfter = words.filter((idx) => idx >= at).length;
      if (wordsBefore < MIN_WORDS_PER_ROW || wordsAfter < MIN_WORDS_PER_ROW) continue;
      const dist = Math.abs(w - midWord);
      if (!bestPunct || dist < bestPunct.dist) {
        bestPunct = { tokenIndex: at, dist };
      }
    }
  }

  if (bestPunct) {
    return { breakAtTokenIndex: bestPunct.tokenIndex, reason: 'punctuation' };
  }

  // Fallback: break before the mid word (leave enough words on each side).
  const clampedMid = Math.min(
    words.length - MIN_WORDS_PER_ROW,
    Math.max(MIN_WORDS_PER_ROW, midWord),
  );
  const breakAt = words[clampedMid]!;
  if (breakAt <= 0 || breakAt >= tokens.length) return null;

  return { breakAtTokenIndex: breakAt, reason: 'word' };
}

/**
 * Soft-break plan for plain ALARE text when Pretty tokens are unavailable.
 * Returns character index into the string for the start of row 2.
 */
export function planPlainLineSoftBreak(
  text: string,
  options: SoftBreakOptions = {},
): { breakAtCharIndex: number; reason: 'punctuation' | 'word' } | null {
  const opts = { ...DEFAULTS, ...options };
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  // Same hard floor as the Pretty path — never chop already-small lines.
  if (wordCount < HARD_MIN_WORDS && trimmed.length < HARD_MIN_CHARS) return null;
  if (wordCount < opts.minWords && trimmed.length < opts.minChars) {
    if (wordCount < HARD_MIN_WORDS) return null;
  }
  if (wordCount < MIN_WORDS_PER_ROW * 2) return null;

  const mid = Math.floor(trimmed.length / 2);
  const radius = Math.max(8, Math.floor(trimmed.length * opts.punctSearchRadius));

  let bestPunct = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = Math.max(1, mid - radius); i <= Math.min(trimmed.length - 2, mid + radius); i += 1) {
    const ch = trimmed[i];
    if (ch !== ',' && ch !== ';' && ch !== ':') continue;
    const after = i + 1;
    // Prefer break after following space.
    let at = after;
    while (at < trimmed.length && /\s/.test(trimmed[at]!)) at += 1;
    if (at <= 0 || at >= trimmed.length) continue;
    const beforeWords = trimmed.slice(0, at).trim().split(/\s+/).filter(Boolean).length;
    const afterWords = trimmed.slice(at).trim().split(/\s+/).filter(Boolean).length;
    if (beforeWords < MIN_WORDS_PER_ROW || afterWords < MIN_WORDS_PER_ROW) continue;
    const dist = Math.abs(i - mid);
    if (dist < bestDist) {
      bestDist = dist;
      bestPunct = at;
    }
  }

  if (bestPunct > 0) {
    return { breakAtCharIndex: bestPunct, reason: 'punctuation' };
  }

  // Break at nearest whitespace to midpoint with enough words on both sides.
  let left = mid;
  let right = mid;
  while (left > 1 && !/\s/.test(trimmed[left]!)) left -= 1;
  while (right < trimmed.length - 1 && !/\s/.test(trimmed[right]!)) right += 1;

  const candidates = [left + 1, right + 1].filter((at) => at > 0 && at < trimmed.length);
  let bestWord = -1;
  let bestWordDist = Number.POSITIVE_INFINITY;
  for (const at of candidates) {
    const beforeWords = trimmed.slice(0, at).trim().split(/\s+/).filter(Boolean).length;
    const afterWords = trimmed.slice(at).trim().split(/\s+/).filter(Boolean).length;
    if (beforeWords < MIN_WORDS_PER_ROW || afterWords < MIN_WORDS_PER_ROW) continue;
    const dist = Math.abs(at - mid);
    if (dist < bestWordDist) {
      bestWordDist = dist;
      bestWord = at;
    }
  }

  if (bestWord <= 0) return null;
  return { breakAtCharIndex: bestWord, reason: 'word' };
}

/**
 * Longest visual row length after a soft-break (or full line if no break).
 * Used by VC container font fit so soft breaks unlock larger type.
 */
export function softBrokenMaxRowChars(text: string, options: SoftBreakOptions = {}): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const plan = planPlainLineSoftBreak(trimmed, options);
  if (!plan) return trimmed.length;
  const row1 = trimmed.slice(0, plan.breakAtCharIndex).trimEnd().length;
  const row2 = trimmed.slice(plan.breakAtCharIndex).trimStart().length;
  return Math.max(row1, row2, 1);
}

/**
 * Soft-broken slots are taller than a single row (two rows + tight related gap).
 * Used for height-fit + ALARE geometry estimates until pixel scroll maps land.
 * Kept below 2× because forced soft-return spacing is much tighter than natural.
 */
export const SOFT_BREAK_SLOT_HEIGHT_RATIO = 1.55;
