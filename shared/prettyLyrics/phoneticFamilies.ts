/**
 * Terminal-word Double Metaphone families (Stage H).
 * Groups line-ending content words that likely sound alike — for restrained
 * matching treatments (hue / underline), not size inflation.
 */

import { doubleMetaphone } from 'double-metaphone';

import { isStopWord } from './lexical';
import type { ParsedSource } from './parseSource';
import type { PhoneticFamily } from './types';

type Terminal = {
  lineId: string;
  /** Exact line normalized text — used to skip pure exact-repeat groups. */
  lineNormalized: string;
  tokenId: string;
  normalized: string;
  primary: string;
  secondary: string;
};

function metaphoneCodesMatch(a: Terminal, b: Terminal): boolean {
  if (!a.primary || !b.primary) return false;
  return (
    a.primary === b.primary ||
    a.primary === b.secondary ||
    (Boolean(a.secondary) && a.secondary === b.primary)
  );
}

/**
 * Last meaningful content word on a line, or null when the line has none.
 */
function terminalForLine(source: ParsedSource, lineId: string): Terminal | null {
  const line = source.allLines.find((l) => l.id === lineId);
  if (!line) return null;
  const words = line.tokens.filter((t) => t.isWord && t.normalizedText);
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const tok = words[i]!;
    if (isStopWord(tok.normalizedText)) continue;
    const [primary, secondary] = doubleMetaphone(tok.normalizedText);
    if (!primary) return null;
    return {
      lineId: line.id,
      lineNormalized: line.normalizedText,
      tokenId: tok.id,
      normalized: tok.normalizedText,
      primary,
      secondary: secondary ?? '',
    };
  }
  return null;
}

/**
 * Build phonetic tail families when enablePhoneticTails is on.
 * Drops clusters that only exist because the same line text repeated exactly.
 */
export function buildPhoneticFamilies(source: ParsedSource): PhoneticFamily[] {
  const terminals: Terminal[] = [];
  for (const line of source.allLines) {
    const term = terminalForLine(source, line.id);
    if (term) terminals.push(term);
  }
  if (terminals.length < 2) return [];

  // Union-find over terminals whose metaphone codes overlap.
  const parent = terminals.map((_, i) => i);
  const find = (i: number): number => {
    let p = i;
    while (parent[p] !== p) p = parent[p]!;
    let x = i;
    while (parent[x] !== p) {
      const next = parent[x]!;
      parent[x] = p;
      x = next;
    }
    return p;
  };
  const unite = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < terminals.length; i += 1) {
    for (let j = i + 1; j < terminals.length; j += 1) {
      if (metaphoneCodesMatch(terminals[i]!, terminals[j]!)) unite(i, j);
    }
  }

  const clusters = new Map<number, Terminal[]>();
  terminals.forEach((t, i) => {
    const root = find(i);
    const list = clusters.get(root) ?? [];
    list.push(t);
    clusters.set(root, list);
  });

  const families: PhoneticFamily[] = [];
  let idx = 0;
  for (const members of clusters.values()) {
    const uniqLines = new Set(members.map((m) => m.lineId));
    if (uniqLines.size < 2) continue;

    // Solely exact line repetition: one normalized line text, repeated.
    const uniqLineText = new Set(members.map((m) => m.lineNormalized));
    if (uniqLineText.size === 1) continue;

    const uniqSpellings = new Set(members.map((m) => m.normalized));
    // Distinct pronunciations → medium; same spelling across different lines → low.
    const confidence: PhoneticFamily['confidence'] =
      uniqSpellings.size >= 2 ? 'medium' : 'low';

    families.push({
      id: `phon-tail-${idx}`,
      tokenIds: [...new Set(members.map((m) => m.tokenId))],
      confidence,
    });
    idx += 1;
  }

  return families;
}
