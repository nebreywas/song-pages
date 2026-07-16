/**
 * Compile plain lyrics → LyricTypographyManifest.
 * Pure, synchronous, deterministic. Demo 0 shell + Demo 1 recurrence (+ heuristic POS).
 */

import { getPrettyLyricsFont } from './fonts';
import { hashString, seededIndex, sourceHash } from './hash';
import { isContentWord, isPivotWord, isStopWord, POS_CONTENT_WEIGHT } from './lexical';
import { parsePrettyLyricsSource, type ParsedLine, type ParsedSource } from './parseSource';
import { resolvePrettyLyricsPalette } from './palettes';
import { buildPhoneticFamilies } from './phoneticFamilies';
import { getPrettyLyricsPreset, type PrettyLyricsPreset } from './presets';
import { combinedLineSimilarity } from './similarity';
import {
  DEFAULT_PRETTY_LYRICS_OPTIONS,
  PRETTY_LYRICS_COMPILER_VERSION,
  PRETTY_LYRICS_STYLE_VERSION,
  type BlockFeatures,
  type BlockShape,
  type LineDensity,
  type LineLayout,
  type LyricTypographyManifest,
  type PhoneticFamily,
  type PhraseMotif,
  type PrettyLyricsCompileOptions,
  type RepetitionGroup,
  type StyleReason,
  type TokenEvidenceScores,
  type TokenTypographyRole,
  type TypographyBlock,
  type TypographyLine,
  type TypographyPalette,
  type TypographyToken,
} from './types';

function emptyEvidence(): TokenEvidenceScores {
  return {
    content: 0,
    motif: 0,
    rarity: 0,
    phraseMembership: 0,
    lineTerminal: 0,
    pivot: 0,
    phoneticFamily: 0,
    localRepetition: 0,
  };
}

function visualSalience(e: TokenEvidenceScores): number {
  return (
    e.content * 0.28 +
    e.motif * 0.26 +
    e.phraseMembership * 0.16 +
    e.rarity * 0.1 +
    e.localRepetition * 0.08 +
    e.lineTerminal * 0.05 +
    e.pivot * 0.04 +
    e.phoneticFamily * 0.03
  );
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx] ?? 0;
}

function classifyBlockShape(
  features: BlockFeatures,
  repeatedLineRatio: number,
  enableParallel: boolean,
): BlockShape {
  if (repeatedLineRatio >= 0.55) return 'repeated';
  if (features.lineCount === 1 && features.wordCount <= 4) return 'transition';
  if (features.densityScore >= 0.72) return 'dense';
  if (features.densityScore <= 0.28 || features.meanLineLength <= 18) return 'sparse';
  if (enableParallel && features.lineLengthVariance < 4 && features.lineCount >= 3) return 'parallel';
  return 'standard';
}

function buildBlockFeatures(lines: ParsedLine[], repeatedLineIds: Set<string>): BlockFeatures {
  const lineCount = lines.length;
  const wordCount = lines.reduce((s, l) => s + l.wordCount, 0);
  const lengths = lines.map((l) => l.rawText.length);
  const characterCount = lengths.reduce((s, n) => s + n, 0);
  const meanLineLength = lineCount ? characterCount / lineCount : 0;
  const variance =
    lineCount > 1
      ? lengths.reduce((s, n) => s + (n - meanLineLength) ** 2, 0) / lineCount
      : 0;
  const repeated = lines.filter((l) => repeatedLineIds.has(l.id)).length;
  const repeatedLineRatio = lineCount ? repeated / lineCount : 0;
  const densityScore = Math.min(1, wordCount / Math.max(1, lineCount * 8));
  return {
    lineCount,
    wordCount,
    characterCount,
    meanLineLength,
    lineLengthVariance: variance,
    repeatedLineRatio,
    densityScore,
  };
}

type AnalysisMaps = {
  lineCounts: Map<string, number>;
  wordCounts: Map<string, number>;
  repeatedLineIds: Set<string>;
  /** Cousin lines — relatedThreshold band only (not treated as repeated shape). */
  relatedLineIds: Set<string>;
  nearGroups: Map<string, string[]>;
  relatedGroups: Map<string, string[]>;
  openings: Map<string, string[]>;
  endings: Map<string, string[]>;
  motifs: PhraseMotif[];
  repetitionGroups: RepetitionGroup[];
  phoneticFamilies: PhoneticFamily[];
  /** tokenId → family for O(1) evidence attach in compose. */
  phoneticByTokenId: Map<string, PhoneticFamily>;
};

function analyzeRecurrence(
  source: ParsedSource,
  options: PrettyLyricsCompileOptions,
  seed: number,
): AnalysisMaps {
  const lineCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();
  const openings = new Map<string, string[]>();
  const endings = new Map<string, string[]>();
  const repeatedLineIds = new Set<string>();
  const relatedLineIds = new Set<string>();
  const nearGroups = new Map<string, string[]>();
  const relatedGroups = new Map<string, string[]>();
  const repetitionGroups: RepetitionGroup[] = [];
  const motifs: PhraseMotif[] = [];

  for (const line of source.allLines) {
    if (line.normalizedText) {
      lineCounts.set(line.normalizedText, (lineCounts.get(line.normalizedText) ?? 0) + 1);
    }
    for (const tok of line.tokens) {
      if (!tok.isWord || !tok.normalizedText) continue;
      wordCounts.set(tok.normalizedText, (wordCounts.get(tok.normalizedText) ?? 0) + 1);
    }
  }

  if (options.enableExactLineRecurrence) {
    let groupIdx = 0;
    for (const [key, count] of lineCounts) {
      if (count < 2) continue;
      const lineIds = source.allLines.filter((l) => l.normalizedText === key).map((l) => l.id);
      for (const id of lineIds) repeatedLineIds.add(id);
      repetitionGroups.push({
        id: `rep-line-${groupIdx}`,
        kind: 'line',
        key,
        count,
        lineIds,
      });
      groupIdx += 1;
    }

    // Near-duplicates (≥ near) vs related band (related ≤ sim < near) — from the spec.
    const relatedFloor = Math.min(options.relatedThreshold, options.nearDuplicateThreshold);
    for (let i = 0; i < source.allLines.length; i += 1) {
      const a = source.allLines[i]!;
      if (a.contentTokens.length < 3) continue;
      for (let j = i + 1; j < source.allLines.length; j += 1) {
        const b = source.allLines[j]!;
        if (b.contentTokens.length < 3) continue;
        const ratio =
          Math.min(a.wordCount, b.wordCount) / Math.max(a.wordCount, b.wordCount, 1);
        if (ratio < 0.55) continue;
        if (Math.abs(a.normalizedText.length - b.normalizedText.length) > 40) continue;
        const overlap = a.contentTokens.some((t) => b.contentTokens.includes(t));
        if (!overlap) continue;
        if (a.normalizedText === b.normalizedText) continue;
        const sim = combinedLineSimilarity(
          a.contentTokens,
          b.contentTokens,
          a.normalizedText,
          b.normalizedText,
        );
        const key = [a.normalizedText, b.normalizedText].sort().join('||');
        if (sim >= options.nearDuplicateThreshold) {
          const list = nearGroups.get(key) ?? [];
          if (!list.includes(a.id)) list.push(a.id);
          if (!list.includes(b.id)) list.push(b.id);
          nearGroups.set(key, list);
          repeatedLineIds.add(a.id);
          repeatedLineIds.add(b.id);
        } else if (sim >= relatedFloor) {
          // Cousin lines: soft kinship, not repeated-block shape.
          const list = relatedGroups.get(key) ?? [];
          if (!list.includes(a.id)) list.push(a.id);
          if (!list.includes(b.id)) list.push(b.id);
          relatedGroups.set(key, list);
          relatedLineIds.add(a.id);
          relatedLineIds.add(b.id);
        }
      }
    }

    let relatedIdx = 0;
    for (const [key, lineIds] of relatedGroups) {
      repetitionGroups.push({
        id: `rep-related-${relatedIdx}`,
        kind: 'related',
        key,
        count: lineIds.length,
        lineIds: [...lineIds],
      });
      relatedIdx += 1;
    }
  }

  if (options.enableRepeatedOpeningsEndings) {
    for (const line of source.allLines) {
      const content = line.tokens.filter((t) => t.isWord && t.normalizedText);
      if (content.length === 0) continue;
      for (let n = 1; n <= 3; n += 1) {
        if (content.length < n) break;
        const openKey = content
          .slice(0, n)
          .map((t) => t.normalizedText)
          .join(' ');
        if (openKey.split(' ').every(isStopWord)) continue;
        const openList = openings.get(openKey) ?? [];
        openList.push(line.id);
        openings.set(openKey, openList);

        const endKey = content
          .slice(-n)
          .map((t) => t.normalizedText)
          .join(' ');
        if (endKey.split(' ').every(isStopWord)) continue;
        const endList = endings.get(endKey) ?? [];
        endList.push(line.id);
        endings.set(endKey, endList);
      }
    }

    let oIdx = 0;
    for (const [key, lineIds] of openings) {
      const uniq = [...new Set(lineIds)];
      if (uniq.length < 2) continue;
      repetitionGroups.push({
        id: `rep-open-${oIdx}`,
        kind: 'opening',
        key,
        count: uniq.length,
        lineIds: uniq,
      });
      oIdx += 1;
    }
    let eIdx = 0;
    for (const [key, lineIds] of endings) {
      const uniq = [...new Set(lineIds)];
      if (uniq.length < 2) continue;
      repetitionGroups.push({
        id: `rep-end-${eIdx}`,
        kind: 'ending',
        key,
        count: uniq.length,
        lineIds: uniq,
      });
      eIdx += 1;
    }
  }

  if (options.enableRepeatedPhrases) {
    type Cand = { phrase: string; lineIds: Set<string>; n: number };
    const candidates = new Map<string, Cand>();

    for (const line of source.allLines) {
      const words = line.tokens.filter((t) => t.isWord && t.normalizedText).map((t) => t.normalizedText);
      for (let n = options.phraseMinLength; n <= options.phraseMaxLength; n += 1) {
        if (words.length < n) continue;
        for (let i = 0; i + n <= words.length; i += 1) {
          const slice = words.slice(i, i + n);
          if (slice.every(isStopWord)) continue;
          const phrase = slice.join(' ');
          const cand = candidates.get(phrase) ?? { phrase, lineIds: new Set(), n };
          cand.lineIds.add(line.id);
          candidates.set(phrase, cand);
        }
      }
    }

    const scored: Array<Cand & { score: number }> = [];
    for (const cand of candidates.values()) {
      if (cand.lineIds.size < 2) continue;
      const tokens = cand.phrase.split(' ');
      const contentRatio = tokens.filter((t) => !isStopWord(t)).length / tokens.length;
      const lengthWeight = 0.55 + cand.n * 0.12;
      const occurrenceWeight = Math.min(2.2, Math.log2(cand.lineIds.size + 1));
      const coverageWeight = Math.min(1.4, cand.lineIds.size / Math.max(3, source.allLines.length * 0.15));
      const score = lengthWeight * occurrenceWeight * contentRatio * coverageWeight;
      scored.push({ ...cand, score });
    }

    scored.sort((a, b) => b.score - a.score || b.n - a.n);

    // Prefer longer phrases — drop contained shorter ones with same coverage.
    const kept: typeof scored = [];
    for (const cand of scored) {
      const contained = kept.some(
        (k) =>
          k.phrase.includes(cand.phrase) &&
          k.lineIds.size === cand.lineIds.size &&
          k.n > cand.n,
      );
      if (contained) continue;
      kept.push(cand);
    }

    kept.slice(0, 24).forEach((cand, i) => {
      motifs.push({
        id: `motif-${i}`,
        phrase: cand.phrase,
        count: cand.lineIds.size,
        score: cand.score,
        lineIds: [...cand.lineIds],
        colorIndex: seededIndex(seed, cand.phrase, 8),
      });
    });
  }

  const phoneticFamilies = options.enablePhoneticTails
    ? buildPhoneticFamilies(source)
    : [];
  const phoneticByTokenId = new Map<string, PhoneticFamily>();
  for (const family of phoneticFamilies) {
    for (const tokenId of family.tokenIds) {
      phoneticByTokenId.set(tokenId, family);
    }
  }

  return {
    lineCounts,
    wordCounts,
    repeatedLineIds,
    relatedLineIds,
    nearGroups,
    relatedGroups,
    openings,
    endings,
    motifs,
    repetitionGroups,
    phoneticFamilies,
    phoneticByTokenId,
  };
}

function lineOpeningKey(line: ParsedLine): string | null {
  const content = line.tokens.filter((t) => t.isWord && t.normalizedText).slice(0, 2);
  if (content.length === 0) return null;
  return content.map((t) => t.normalizedText).join(' ');
}

function lineEndingKey(line: ParsedLine): string | null {
  const content = line.tokens.filter((t) => t.isWord && t.normalizedText);
  if (content.length === 0) return null;
  return content
    .slice(-2)
    .map((t) => t.normalizedText)
    .join(' ');
}

function buildDensities(source: ParsedSource, enable: boolean): Map<string, LineDensity> {
  const map = new Map<string, LineDensity>();
  const rawScores: number[] = [];

  for (const line of source.allLines) {
    const words = line.tokens.filter((t) => t.isWord);
    const characterCount = line.rawText.replace(/\s/g, '').length;
    const averageWordLength = words.length
      ? words.reduce((s, t) => s + t.normalizedText.length, 0) / words.length
      : 0;
    const contentWordRatio = line.wordCount
      ? line.contentTokens.length / line.wordCount
      : 0;
    const syllableEstimate = line.syllableEstimate;
    const raw =
      syllableEstimate * 0.45 + line.wordCount * 0.35 + averageWordLength * 0.2;
    rawScores.push(raw);
    map.set(line.id, {
      wordCount: line.wordCount,
      syllableEstimate,
      characterCount,
      averageWordLength,
      contentWordRatio,
      normalizedDensity: enable ? 0.5 : 0.5,
    });
  }

  if (!enable || rawScores.length === 0) return map;

  const sorted = [...rawScores].sort((a, b) => a - b);
  const p10 = percentile(sorted, 0.1);
  const p90 = percentile(sorted, 0.9);
  const span = Math.max(0.001, p90 - p10);

  let i = 0;
  for (const line of source.allLines) {
    const dens = map.get(line.id)!;
    const raw = rawScores[i] ?? 0.5;
    dens.normalizedDensity = Math.min(1, Math.max(0, (raw - p10) / span));
    i += 1;
  }
  return map;
}

function motifHitsForLine(
  line: ParsedLine,
  motifs: PhraseMotif[],
): Array<{ motif: PhraseMotif; startWord: number; len: number }> {
  const words = line.tokens.filter((t) => t.isWord && t.normalizedText).map((t) => t.normalizedText);
  const hits: Array<{ motif: PhraseMotif; startWord: number; len: number }> = [];
  for (const motif of motifs) {
    const parts = motif.phrase.split(' ');
    for (let i = 0; i + parts.length <= words.length; i += 1) {
      let ok = true;
      for (let j = 0; j < parts.length; j += 1) {
        if (words[i + j] !== parts[j]) {
          ok = false;
          break;
        }
      }
      if (ok) hits.push({ motif, startWord: i, len: parts.length });
    }
  }
  return hits;
}

function roleScales(
  role: TokenTypographyRole,
  options: PrettyLyricsCompileOptions,
  preset: PrettyLyricsPreset,
  salience: number,
  evidence: TokenEvidenceScores,
): { scale: number; weight: number; opacity: number } {
  const v = Math.max(0, options.sizeVariance);
  const strong = preset.strongSizeHierarchy ? 1.1 : 1;
  // Tie size to measurement scores, not just role labels.
  const measurementKick =
    (salience * 0.55 + evidence.rarity * 0.2 + evidence.motif * 0.15 + evidence.localRepetition * 0.1) * v;

  switch (role) {
    case 'quiet':
      return {
        scale: Math.max(0.72, 0.9 - 0.08 * v),
        weight: 400,
        opacity: Math.max(0.55, 0.78 - 0.06 * v),
      };
    case 'standard':
      return {
        scale: 1 + measurementKick * 0.08,
        weight: 500,
        opacity: 1,
      };
    case 'accent':
      return {
        scale: Math.min(
          options.accentMaxScale * strong,
          1.04 + measurementKick * 0.28,
        ),
        weight: preset.weightFirst ? 700 : 600,
        opacity: 1,
      };
    case 'anchor':
      return {
        scale: Math.min(
          options.anchorMaxScale * strong,
          1.14 + measurementKick * 0.42,
        ),
        weight: preset.weightFirst ? 800 : 720,
        opacity: 1,
      };
    case 'motif':
      return {
        scale: Math.min(
          options.motifMaxScale * strong,
          1.06 + measurementKick * 0.34,
        ),
        weight: preset.weightFirst ? 750 : 650,
        opacity: 1,
      };
    case 'phonetic-tail':
      return { scale: 1.02 + measurementKick * 0.05, weight: 550, opacity: 1 };
    default:
      return { scale: 1, weight: 500, opacity: 1 };
  }
}

/**
 * Sibling-face expressiveness — maps lyric analysis into pack variance.
 * Higher = worth a non-primary face; quiet/connectors stay primary.
 */
function fontMixExpressiveness(
  salience: number,
  evidence: TokenEvidenceScores,
): number {
  return (
    salience * 0.34 +
    evidence.motif * 0.22 +
    evidence.rarity * 0.18 +
    evidence.phraseMembership * 0.12 +
    evidence.pivot * 0.07 +
    evidence.lineTerminal * 0.04 +
    evidence.localRepetition * 0.03
  );
}

/**
 * Soft glow = sparse special emphasis from existing analysis scores.
 * Prefer short/sparse peaks (chorus title words) and true peaks on longer lines.
 * Avoid washing motif/phrase *groups* on dense lines — not word-specific rules.
 */
function assignGlowForLine(input: {
  enabled: boolean;
  lineWordCount: number;
  lineKind: 'standard' | 'sparse' | 'dense' | 'transition';
  candidates: Array<{
    tokenIndex: number;
    role: TokenTypographyRole;
    salience: number;
    evidence: TokenEvidenceScores;
    normalizedText: string;
  }>;
}): Set<number> {
  const out = new Set<number>();
  if (!input.enabled) return out;

  const sparseLine = input.lineWordCount <= 2 || input.lineKind === 'sparse';

  const scored = input.candidates
    .filter((c) => c.role !== 'quiet')
    .map((c) => {
      // Dense phrase/motif clusters keep color/scale — glow stays for peaks.
      const phraseCrowd =
        !sparseLine &&
        c.evidence.phraseMembership >= 0.55 &&
        c.evidence.localRepetition < 0.4 &&
        input.lineWordCount >= 5;
      if (phraseCrowd && c.role === 'motif') return null;

      const sparsePeak =
        sparseLine &&
        (c.role === 'anchor' || c.role === 'accent' || c.role === 'motif') &&
        c.evidence.content >= 0.35;

      const score =
        c.salience * 0.36 +
        c.evidence.motif * 0.2 +
        c.evidence.content * 0.14 +
        c.evidence.rarity * 0.1 +
        c.evidence.localRepetition * 0.2 +
        (c.role === 'anchor' ? 0.08 : 0) +
        (sparsePeak ? 0.24 : 0) -
        // Only drag phrase on denser lines so parallel short titles (Need/Fool/Bind) still peak.
        (sparseLine ? 0 : c.evidence.phraseMembership * 0.1);

      const floor = sparsePeak ? 0.36 : 0.48;
      if (score < floor) return null;

      return {
        tokenIndex: c.tokenIndex,
        score,
        sparsePeak,
        localRep: c.evidence.localRepetition,
        normalizedText: c.normalizedText,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return out;

  // One glow by default; a second only for a clear runner-up peak (not a group halo).
  out.add(scored[0]!.tokenIndex);
  const second = scored[1];
  if (
    second &&
    !sparseLine &&
    second.score >= scored[0]!.score * 0.9 &&
    (second.localRep >= 0.45 || second.score >= 0.62) &&
    second.normalizedText !== scored[0]!.normalizedText
  ) {
    out.add(second.tokenIndex);
  }

  return out;
}

type FontFaceId = 'primary' | 'display' | 'alt';

/**
 * Promote a small set of high-evidence tokens onto display/alt siblings.
 * Per-line budget keeps the primary face dominant — mix is variance, not replacement.
 */
function assignFontFacesForLine(input: {
  enabled: boolean;
  strength: number;
  candidates: Array<{
    tokenIndex: number;
    role: TokenTypographyRole;
    salience: number;
    evidence: TokenEvidenceScores;
  }>;
  wordCount: number;
}): Map<number, FontFaceId> {
  const out = new Map<number, FontFaceId>();
  if (!input.enabled || input.strength <= 0) return out;

  const strength = Math.max(0, Math.min(2.5, input.strength));
  const scored = input.candidates
    .filter((c) => c.role !== 'quiet')
    .map((c) => ({
      ...c,
      express: fontMixExpressiveness(c.salience, c.evidence) * strength,
    }))
    .filter((c) => c.express >= 0.28)
    .sort((a, b) => b.express - a.express);

  // Cap how many faces leave primary so mix deepens contrast instead of replacing the pack.
  const budget = Math.max(
    1,
    Math.min(
      scored.length,
      Math.floor(input.wordCount * (0.18 + 0.12 * Math.min(1, strength))),
    ),
  );

  for (let i = 0; i < budget; i += 1) {
    const c = scored[i];
    if (!c) break;
    // Peak analysis → display sibling; mid expressiveness with distinctive signals → alt.
    if (c.express >= 0.62 || (c.role === 'anchor' && c.express >= 0.48)) {
      out.set(c.tokenIndex, 'display');
    } else if (
      c.express >= 0.36 ||
      c.evidence.rarity >= 0.45 ||
      c.evidence.pivot >= 0.5 ||
      c.evidence.phraseMembership >= 0.55
    ) {
      out.set(c.tokenIndex, 'alt');
    }
  }

  return out;
}

/** Consecutive content words sharing an initial letter (spelling-based Demo 3-lite). */
function findAlliterationPairs(line: ParsedLine): Set<number> {
  const wordIdxs: number[] = [];
  const initials: string[] = [];
  line.tokens.forEach((t, i) => {
    if (!t.isWord || !t.normalizedText) return;
    if (!isContentWord(t.normalizedText, t.lexicalRole)) return;
    const initial = t.normalizedText.replace(/[^a-z]/g, '')[0];
    if (!initial) return;
    wordIdxs.push(i);
    initials.push(initial);
  });

  const hit = new Set<number>();
  for (let i = 0; i < initials.length - 1; i += 1) {
    if (initials[i] === initials[i + 1]) {
      hit.add(wordIdxs[i]!);
      hit.add(wordIdxs[i + 1]!);
    }
  }
  return hit;
}

/** Deterministic ±drift for centered layouts. */
function centerOffsetPct(
  lineId: string,
  seed: number,
  maxPct: number,
  lineKind: LineLayout['kind'],
): number {
  if (maxPct <= 0) return 0;
  // Sparse / transition lines drift more; dense stay nearer the axis.
  const amplitude =
    lineKind === 'sparse' || lineKind === 'transition'
      ? maxPct
      : lineKind === 'dense'
        ? maxPct * 0.35
        : maxPct * 0.7;
  const unit = (hashString(`${seed}:drift:${lineId}`) % 2001) / 1000 - 1; // [-1, 1]
  return Number((unit * amplitude).toFixed(2));
}

function enforceBudget(
  candidates: Array<{
    tokenIndex: number;
    role: TokenTypographyRole;
    salience: number;
  }>,
  wordCount: number,
  options: PrettyLyricsCompileOptions,
): Set<number> {
  const allowed = new Set<number>();
  const sorted = [...candidates].sort((a, b) => b.salience - a.salience);
  let anchors = 0;
  let accents = 0;
  const maxSpecial = Math.max(
    1,
    Math.floor(wordCount * (1 - options.minimumStandardTokenRatio)),
  );

  for (const c of sorted) {
    if (allowed.size >= maxSpecial) break;
    if (c.role === 'anchor' || c.role === 'motif') {
      if (anchors >= options.maxAnchorsPerLine) {
        if (accents >= options.maxAccentsPerLine) continue;
        accents += 1;
        allowed.add(c.tokenIndex);
        continue;
      }
      anchors += 1;
      allowed.add(c.tokenIndex);
      continue;
    }
    if (c.role === 'accent') {
      if (accents >= options.maxAccentsPerLine) continue;
      accents += 1;
      allowed.add(c.tokenIndex);
    }
  }
  return allowed;
}

function composeManifest(
  source: ParsedSource,
  analysis: AnalysisMaps,
  densities: Map<string, LineDensity>,
  options: PrettyLyricsCompileOptions,
  preset: PrettyLyricsPreset,
  palette: TypographyPalette,
  seed: number,
  hash: string,
  compileMs: number,
): LyricTypographyManifest {
  const totalWords = [...analysis.wordCounts.values()].reduce((s, n) => s + n, 0);
  const blocks: TypographyBlock[] = [];

  for (const block of source.blocks) {
    const features = buildBlockFeatures(block.lines, analysis.repeatedLineIds);
    const shape = classifyBlockShape(
      features,
      features.repeatedLineRatio,
      options.enableParallelStructure,
    );
    const center =
      preset.centerRepeatedBlocks && (shape === 'repeated' || shape === 'sparse' || shape === 'transition');

    const lines: TypographyLine[] = [];
    let prevDensity = 0.5;
    for (const line of block.lines) {
      const density = densities.get(line.id)!;
      const openingKey = lineOpeningKey(line);
      const endingKey = lineEndingKey(line);
      const motifHits = options.enableRepeatedPhrases
        ? motifHitsForLine(line, analysis.motifs)
        : [];
      const alliterated = options.enableAlliteration
        ? findAlliterationPairs(line)
        : new Set<number>();

      const wordIndices: number[] = [];
      line.tokens.forEach((t, i) => {
        if (t.isWord) wordIndices.push(i);
      });

      const localCounts = new Map<string, number>();
      for (const t of line.tokens) {
        if (!t.isWord) continue;
        localCounts.set(t.normalizedText, (localCounts.get(t.normalizedText) ?? 0) + 1);
      }

      type Cand = {
        tokenIndex: number;
        role: TokenTypographyRole;
        salience: number;
        evidence: TokenEvidenceScores;
        reasons: StyleReason[];
        colorRole: string;
        underline: boolean;
      };
      const candidates: Cand[] = [];

      let wordOrdinal = -1;
      for (let ti = 0; ti < line.tokens.length; ti += 1) {
        const tok = line.tokens[ti]!;
        if (!tok.isWord) continue;
        wordOrdinal += 1;

        const evidence = emptyEvidence();
        const reasons: StyleReason[] = [];

        if (options.enableHeuristicPos) {
          evidence.content = POS_CONTENT_WEIGHT[tok.lexicalRole];
          if (evidence.content >= 0.8) {
            reasons.push({ rule: 'content-word', score: evidence.content, detail: tok.lexicalRole });
          }
        } else {
          evidence.content = isStopWord(tok.normalizedText) ? 0.1 : 0.55;
        }

        const globalCount = analysis.wordCounts.get(tok.normalizedText) ?? 1;
        const rarity = 1 - Math.min(1, Math.log2(globalCount + 1) / Math.log2(Math.max(4, totalWords / 8)));
        evidence.rarity = rarity;

        const localRep = localCounts.get(tok.normalizedText) ?? 1;
        if (localRep >= 2) {
          evidence.localRepetition = Math.min(1, (localRep - 1) / 2);
          reasons.push({
            rule: 'local-repetition',
            score: evidence.localRepetition,
            detail: `${localRep}× in line`,
          });
        }

        // Track-level content-word recurrence — chorus keywords that fire once per line.
        if (
          globalCount >= 3 &&
          isContentWord(tok.normalizedText, tok.lexicalRole)
        ) {
          const trackBoost = Math.min(0.7, 0.32 + (globalCount - 3) * 0.1);
          evidence.localRepetition = Math.max(evidence.localRepetition, trackBoost);
          reasons.push({
            rule: 'track-repetition',
            score: trackBoost,
            detail: `${globalCount}× in song`,
          });
        }

        if (options.enablePivotWords && isPivotWord(tok.normalizedText)) {
          evidence.pivot = 0.85;
          reasons.push({ rule: 'pivot', score: 0.85 });
        }

        if (analysis.repeatedLineIds.has(line.id)) {
          evidence.motif = Math.max(evidence.motif, 0.55);
          reasons.push({ rule: 'repeated-line', score: 0.55 });
        } else if (analysis.relatedLineIds.has(line.id)) {
          // Softer cousin band — kinship without repeated-block shape kick.
          evidence.motif = Math.max(evidence.motif, 0.32);
          evidence.phraseMembership = Math.max(evidence.phraseMembership, 0.28);
          reasons.push({ rule: 'related-line', score: 0.32 });
        }

        const motifHit = motifHits.find(
          (h) => wordOrdinal >= h.startWord && wordOrdinal < h.startWord + h.len,
        );
        if (motifHit) {
          evidence.phraseMembership = Math.min(1, 0.55 + motifHit.motif.score * 0.15);
          evidence.motif = Math.max(evidence.motif, 0.85);
          reasons.push({
            rule: 'repeated-phrase',
            evidenceId: motifHit.motif.id,
            score: evidence.phraseMembership,
            detail: motifHit.motif.phrase,
          });
        }

        if (alliterated.has(ti)) {
          evidence.content = Math.min(1, evidence.content + 0.12);
          evidence.phraseMembership = Math.max(evidence.phraseMembership, 0.35);
          reasons.push({ rule: 'alliteration', score: 0.4 });
        }

        if (options.enableRepeatedOpeningsEndings) {
          const openCount = openingKey ? (analysis.openings.get(openingKey)?.length ?? 0) : 0;
          if (openCount >= 2 && wordOrdinal < openingKey!.split(' ').length) {
            evidence.phraseMembership = Math.max(evidence.phraseMembership, 0.7);
            reasons.push({ rule: 'parallel-opening', score: 0.7, detail: openingKey ?? undefined });
          }
          const endParts = endingKey?.split(' ') ?? [];
          const endCount = endingKey ? (analysis.endings.get(endingKey)?.length ?? 0) : 0;
          if (endCount >= 2 && wordOrdinal >= wordIndices.length - endParts.length) {
            evidence.lineTerminal = 0.75;
            reasons.push({ rule: 'parallel-ending', score: 0.75, detail: endingKey ?? undefined });
          }
        }

        if (wordOrdinal === wordIndices.length - 1 && isContentWord(tok.normalizedText, tok.lexicalRole)) {
          evidence.lineTerminal = Math.max(evidence.lineTerminal, 0.35);
        }

        const phoneticFamily = analysis.phoneticByTokenId.get(tok.id);
        if (phoneticFamily) {
          evidence.phoneticFamily = phoneticFamily.confidence === 'medium' ? 0.72 : 0.48;
          evidence.lineTerminal = Math.max(evidence.lineTerminal, 0.55);
          reasons.push({
            rule: 'phonetic-tail',
            evidenceId: phoneticFamily.id,
            score: evidence.phoneticFamily,
            detail: phoneticFamily.confidence,
          });
        }

        const salience = visualSalience(evidence);
        let role: TokenTypographyRole = 'standard';
        let colorRole = 'base';
        let underline = false;

        if (evidence.content < 0.25 && evidence.motif < 0.4 && evidence.phraseMembership < 0.4) {
          role = 'quiet';
          colorRole = 'quiet';
        } else if (motifHit || evidence.motif >= 0.8) {
          role = 'motif';
          const idx =
            motifHit?.motif.colorIndex ?? seededIndex(seed, tok.normalizedText, palette.motifs.length);
          colorRole = `motif-${idx % palette.motifs.length}`;
          // Motif identity is color/weight by default — underlines are optional (often too noisy).
          underline = options.enableUnderlines && Boolean(motifHit);
        } else if (salience >= 0.52) {
          role = 'anchor';
          colorRole = `accent-${seededIndex(seed, `${line.id}:${tok.id}`, palette.accents.length)}`;
          reasons.push({ rule: 'line-anchor', score: salience });
        } else if (salience >= 0.34 || alliterated.has(ti)) {
          role = 'accent';
          colorRole = `accent-${seededIndex(seed, tok.normalizedText, palette.accents.length)}`;
        }

        // Phonetic tails: restrained hue/underline match — never size starring.
        if (phoneticFamily && role !== 'quiet' && role !== 'anchor' && role !== 'motif') {
          const hueSlot = seededIndex(seed, phoneticFamily.id, palette.underline.length);
          colorRole = `underline-${hueSlot}`;
          if (options.enableUnderlines) underline = true;
          if (role === 'standard') role = 'phonetic-tail';
        }

        if (options.enableUnderlines && evidence.lineTerminal >= 0.7 && role === 'standard') {
          underline = true;
          colorRole = `underline-${seededIndex(seed, endingKey ?? tok.normalizedText, palette.underline.length)}`;
        }

        candidates.push({
          tokenIndex: ti,
          role,
          salience,
          evidence,
          reasons,
          colorRole,
          underline,
        });
      }

      // Emphasis budget only on accent/anchor/motif candidates.
      const budgetSet = enforceBudget(
        candidates
          .filter((c) => c.role === 'anchor' || c.role === 'accent' || c.role === 'motif')
          .map((c) => ({ tokenIndex: c.tokenIndex, role: c.role, salience: c.salience })),
        wordIndices.length,
        options,
      );

      // Finalize roles before font-mix so sibling faces map analysis, not raw pre-budget labels.
      const finalized = candidates.map((cand) => {
        let role = cand.role;
        let colorRole = cand.colorRole;
        let underline = cand.underline;
        let reasons = [...cand.reasons];

        if (
          (role === 'anchor' || role === 'accent' || role === 'motif') &&
          !budgetSet.has(cand.tokenIndex) &&
          role !== 'motif'
        ) {
          role = cand.evidence.content < 0.25 ? 'quiet' : 'standard';
          colorRole = role === 'quiet' ? 'quiet' : 'base';
          underline = false;
          reasons = reasons.filter((r) => r.rule !== 'line-anchor');
        }

        if (cand.evidence.phraseMembership >= 0.55 && role === 'standard') {
          role = 'motif';
          colorRole = cand.colorRole.startsWith('motif') ? cand.colorRole : `motif-0`;
          underline = options.enableUnderlines;
        }

        return {
          ...cand,
          role,
          colorRole,
          underline,
          reasons,
        };
      });

      const fontFaceByToken = assignFontFacesForLine({
        enabled: options.enableFontMix,
        strength: options.fontMixStrength,
        wordCount: wordIndices.length,
        candidates: finalized.map((c) => ({
          tokenIndex: c.tokenIndex,
          role: c.role,
          salience: c.salience,
          evidence: c.evidence,
        })),
      });

      const glowByToken = assignGlowForLine({
        enabled: options.enableGlow,
        lineWordCount: wordIndices.length,
        lineKind:
          density.normalizedDensity > 0.75
            ? 'dense'
            : density.normalizedDensity < 0.3 || wordIndices.length <= 2
              ? 'sparse'
              : 'standard',
        candidates: finalized.map((c) => {
          const tok = line.tokens[c.tokenIndex];
          return {
            tokenIndex: c.tokenIndex,
            role: c.role,
            salience: c.salience,
            evidence: c.evidence,
            normalizedText: tok?.normalizedText ?? '',
          };
        }),
      });

      const tokens: TypographyToken[] = line.tokens.map((tok, ti) => {
        if (!tok.isWord) {
          return {
            id: tok.id,
            rawText: tok.rawText,
            normalizedText: '',
            isWord: false,
            lexicalRole: 'unknown',
            evidence: emptyEvidence(),
            typography: {
              role: 'standard',
              colorRole: 'base',
              scale: 1,
              weight: 400,
              underline: false,
              opacity: 1,
              italic: false,
              glow: false,
              fontFace: 'primary',
            },
            reasons: [],
          };
        }

        const cand = finalized.find((c) => c.tokenIndex === ti)!;
        const role = cand.role;
        const colorRole = cand.colorRole;
        const underline = cand.underline;
        const reasons = [...cand.reasons];

        const scales = { ...roleScales(role, options, preset, cand.salience, cand.evidence) };

        // Lab ornaments (Semantic Canvas-inspired) — off by default.
        const charLen = tok.normalizedText.length;
        const isRepeat =
          cand.evidence.motif >= 0.55 ||
          cand.evidence.phraseMembership >= 0.55 ||
          cand.evidence.localRepetition >= 0.45;

        let italic = false;
        if (options.enableItalics && role !== 'quiet') {
          // Long unique accents / content words — not the glowing anchors.
          italic =
            charLen >= 6 &&
            role !== 'anchor' &&
            !glowByToken.has(ti) &&
            !isRepeat &&
            (role === 'accent' || (role === 'standard' && cand.evidence.content >= 0.45));
          if (italic) reasons.push({ rule: 'line-shape', detail: 'italic-ornament', score: 0.3 });
        }

        const glow = glowByToken.has(ti);
        if (glow) {
          scales.weight = Math.min(900, scales.weight + 50);
          reasons.push({ rule: 'local-repetition', detail: 'glow-ornament', score: 0.45 });
        }

        const fontFace = fontFaceByToken.get(ti) ?? 'primary';
        if (fontFace !== 'primary') {
          reasons.push({
            rule: 'seeded-tiebreak',
            detail: `font-mix:${fontFace}`,
            score: fontMixExpressiveness(cand.salience, cand.evidence),
          });
        }

        return {
          id: tok.id,
          rawText: tok.rawText,
          normalizedText: tok.normalizedText,
          isWord: true,
          lexicalRole: tok.lexicalRole,
          evidence: cand.evidence,
          typography: {
            role,
            colorRole,
            scale: scales.scale * options.baseFontScale,
            weight: scales.weight,
            underline,
            opacity: scales.opacity,
            italic,
            glow,
            fontFace,
          },
          reasons,
        };
      });

      // Continuous density → line scale (measurement-driven, not two hard bins).
      let lineScale = options.baseFontScale;
      if (options.enableDensity) {
        const t = density.normalizedDensity;
        const continuous =
          options.shortLineBoost + (options.denseLineTighten - options.shortLineBoost) * t;
        lineScale *= 1 + (continuous - 1) * options.sizeVariance;
        if (line.wordCount <= 2) lineScale *= 1 + 0.06 * options.sizeVariance;
      }
      if (analysis.repeatedLineIds.has(line.id)) {
        lineScale *= 1 + 0.06 * options.sizeVariance;
      }

      const lineKind: LineLayout['kind'] =
        density.normalizedDensity > 0.75
          ? 'dense'
          : density.normalizedDensity < 0.3 || line.wordCount <= 2
            ? 'sparse'
            : shape === 'transition'
              ? 'transition'
              : 'standard';

      // Abrupt density jumps get breathing room (shape contrast — not "emotion").
      const densityJump = Math.abs(density.normalizedDensity - prevDensity);
      let spaceBefore = options.lineSpacing * (lineKind === 'transition' ? 1.45 : 1);
      if (densityJump >= 0.45) {
        spaceBefore *= 1 + 0.55 * Math.min(1, densityJump);
      }
      prevDensity = density.normalizedDensity;

      const offsetPct = center
        ? centerOffsetPct(line.id, seed, options.centerDriftPct, lineKind)
        : 0;

      lines.push({
        id: line.id,
        rawText: line.rawText,
        normalizedText: line.normalizedText,
        features: {
          density,
          isRepeatedLine: analysis.repeatedLineIds.has(line.id),
          isRelatedLine: analysis.relatedLineIds.has(line.id),
          openingKey,
          endingKey,
        },
        layout: {
          kind: lineKind,
          scale: lineScale,
          spaceBefore,
          spaceAfter: options.lineSpacing * 0.85,
          offsetPct,
        },
        tokens,
      });
    }

    blocks.push({
      id: block.id,
      sourceIndex: block.sourceIndex,
      shape,
      features,
      layout: {
        align: center ? 'center' : 'left',
        maxWidthEm: shape === 'dense' ? 42 : shape === 'sparse' ? 28 : 36,
        spaceBefore: options.blockSpacing,
        spaceAfter: options.blockSpacing * 0.85,
      },
      lines,
    });
  }

  const tokenCount = blocks.reduce(
    (s, b) => s + b.lines.reduce((ls, l) => ls + l.tokens.filter((t) => t.isWord).length, 0),
    0,
  );

  return {
    compilerVersion: PRETTY_LYRICS_COMPILER_VERSION,
    styleVersion: PRETTY_LYRICS_STYLE_VERSION,
    sourceHash: hash,
    presetId: preset.id,
    themeId: options.themeId,
    fontId: options.fontId,
    fontFamily: '',
    letterSpacingEm: 0,
    wordSpacingEm: options.wordSpacingEm,
    glowIntensity: options.glowIntensity,
    monochrome: options.monochrome,
    palette,
    trackSeed: seed,
    metrics: {
      compileMs,
      lineCount: source.allLines.length,
      tokenCount,
      excludedMetadataLines: source.excludedMetadataLines,
    },
    blocks,
    repetitionGroups: analysis.repetitionGroups,
    phraseMotifs: analysis.motifs,
    phoneticFamilies: analysis.phoneticFamilies,
  };
}

export function compileLyricTypography(
  lyrics: string,
  partialOptions: Partial<PrettyLyricsCompileOptions> = {},
): LyricTypographyManifest {
  const started = Date.now();
  const options: PrettyLyricsCompileOptions = {
    ...DEFAULT_PRETTY_LYRICS_OPTIONS,
    ...partialOptions,
  };
  const preset = getPrettyLyricsPreset(options.presetId);
  const font = getPrettyLyricsFont(options.fontId);
  const palette = resolvePrettyLyricsPalette({
    themeId: options.themeId,
    harmonyHue: options.harmonyHue,
    harmonyMode: options.harmonyMode,
    harmonySurface: options.harmonySurface,
    monochrome: options.monochrome,
    fallback: preset.palette,
  });
  const hash = sourceHash(lyrics);
  const seed = options.seed ?? hashString(hash);
  const source = parsePrettyLyricsSource(lyrics);
  const analysis = analyzeRecurrence(source, options, seed);
  const densities = buildDensities(source, options.enableDensity);
  const compileMs = Date.now() - started;
  const manifest = composeManifest(
    source,
    analysis,
    densities,
    options,
    preset,
    palette,
    seed,
    hash,
    compileMs,
  );
  return {
    ...manifest,
    fontId: font.id,
    fontFamily: font.fontFamily,
    letterSpacingEm: font.letterSpacingEm ?? 0,
    wordSpacingEm: options.wordSpacingEm,
    glowIntensity: Math.max(0, Math.min(2, options.glowIntensity)),
    monochrome: options.monochrome,
  };
}
