/** Dice coefficient + Levenshtein for near-duplicate line detection. */

export function diceCoefficient(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let overlap = 0;
  for (const token of a) {
    if (setB.has(token)) overlap += 1;
  }
  return (2 * overlap) / (a.length + b.length);
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? 0;
}

export function combinedLineSimilarity(
  tokensA: string[],
  tokensB: string[],
  normalizedA: string,
  normalizedB: string,
): number {
  const tokenSimilarity = diceCoefficient(tokensA, tokensB);
  const maxLen = Math.max(normalizedA.length, normalizedB.length, 1);
  const editSimilarity = 1 - levenshteinDistance(normalizedA, normalizedB) / maxLen;
  return tokenSimilarity * 0.6 + editSimilarity * 0.4;
}
