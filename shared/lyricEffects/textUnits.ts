/**
 * Split visible lyric text into structural units without semantic roles.
 * Whitespace is preserved so layout does not jump when wrapping pulses.
 */

export type LyricTextUnit = {
  /** Index among word tokens only (spaces are skipped). */
  wordIndex: number;
  text: string;
  isWord: boolean;
};

/** Split into words + whitespace tokens; wordIndex is -1 for whitespace. */
export function splitLyricUnits(text: string): LyricTextUnit[] {
  if (!text) return [];
  const parts = text.split(/(\s+)/);
  const units: LyricTextUnit[] = [];
  let wordIndex = 0;
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      units.push({ wordIndex: -1, text: part, isWord: false });
    } else {
      units.push({ wordIndex, text: part, isWord: true });
      wordIndex += 1;
    }
  }
  return units;
}

export function countWords(text: string): number {
  return splitLyricUnits(text).filter((u) => u.isWord).length;
}

/** Stable 32-bit hash for deterministic scramble / selection seeds. */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic [0, 1) from seed + salt. */
export function hashUnit(seed: string, salt: number): number {
  const h = hashString(`${seed}#${salt}`);
  return (h % 10000) / 10000;
}
