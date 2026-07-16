/**
 * Parse plain lyrics into structural units for analysis.
 * Standalone bracket metadata lines are excluded from display+analysis.
 */

import { classifyLexicalRole, isContentWord } from './lexical';
import {
  estimateSyllables,
  isBracketMetadataLine,
  normalizeForAnalysis,
  normalizeLineEndings,
  tokenizeRawLine,
} from './normalize';

export type ParsedToken = {
  id: string;
  rawText: string;
  normalizedText: string;
  isWord: boolean;
  lexicalRole: ReturnType<typeof classifyLexicalRole>;
};

export type ParsedLine = {
  id: string;
  rawText: string;
  normalizedText: string;
  tokens: ParsedToken[];
  contentTokens: string[];
  wordCount: number;
  syllableEstimate: number;
};

export type ParsedBlock = {
  id: string;
  sourceIndex: number;
  lines: ParsedLine[];
};

export type ParsedSource = {
  blocks: ParsedBlock[];
  excludedMetadataLines: number;
  allLines: ParsedLine[];
};

export function parsePrettyLyricsSource(lyrics: string): ParsedSource {
  const normalized = normalizeLineEndings(lyrics).trim();
  const rawLines = normalized.length ? normalized.split('\n') : [];

  let excludedMetadataLines = 0;
  let lineSeq = 0;
  let blockSeq = 0;
  let tokenSeq = 0;

  const blocks: ParsedBlock[] = [];
  let current: ParsedLine[] = [];

  const flush = () => {
    if (current.length === 0) return;
    blocks.push({
      id: `block-${blockSeq}`,
      sourceIndex: blockSeq,
      lines: current,
    });
    blockSeq += 1;
    current = [];
  };

  for (const rawLine of rawLines) {
    if (isBracketMetadataLine(rawLine)) {
      excludedMetadataLines += 1;
      continue;
    }

    // Blank line = block boundary (preserve structure without assuming verse/chorus).
    if (rawLine.trim() === '') {
      flush();
      continue;
    }

    const normalizedText = normalizeForAnalysis(rawLine);
    const pieces = tokenizeRawLine(rawLine);
    const tokens: ParsedToken[] = [];
    let syllableEstimate = 0;
    const contentTokens: string[] = [];

    for (const piece of pieces) {
      const id = `tok-${tokenSeq}`;
      tokenSeq += 1;
      if (!piece.isWord) {
        tokens.push({
          id,
          rawText: piece.raw,
          normalizedText: '',
          isWord: false,
          lexicalRole: 'unknown',
        });
        continue;
      }
      const role = classifyLexicalRole(piece.normalized);
      tokens.push({
        id,
        rawText: piece.raw,
        normalizedText: piece.normalized,
        isWord: true,
        lexicalRole: role,
      });
      syllableEstimate += estimateSyllables(piece.normalized);
      if (isContentWord(piece.normalized, role)) contentTokens.push(piece.normalized);
    }

    const wordCount = tokens.filter((t) => t.isWord).length;
    current.push({
      id: `line-${lineSeq}`,
      rawText: rawLine,
      normalizedText,
      tokens,
      contentTokens,
      wordCount,
      syllableEstimate,
    });
    lineSeq += 1;
  }

  flush();

  return {
    blocks,
    excludedMetadataLines,
    allLines: blocks.flatMap((b) => b.lines),
  };
}
