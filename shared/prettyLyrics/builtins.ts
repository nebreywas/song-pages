/**
 * Built-in Pretty Lyrics configs for VC hand-off.
 * Tuned in the lab, exported, and checked in as defaults.
 */

import type { PrettyLyricsExportedConfig } from './exportConfig';
import type { PrettyLyricsCompileOptions } from './types';
import { DEFAULT_PRETTY_LYRICS_OPTIONS } from './types';

/**
 * Sample 1 — lab export (coastal dusk + editorial).
 * Background is intentional for the lab; VC ignores palette.background (transparent).
 */
export const PRETTY_LYRICS_SAMPLE_1: PrettyLyricsExportedConfig = {
  format: 'songpages.pretty-lyrics-config',
  formatVersion: 1,
  name: 'Sample 1',
  exportedAt: '2026-07-14T00:52:37.357Z',
  compilerVersion: 1,
  styleVersion: 1,
  options: {
    ...DEFAULT_PRETTY_LYRICS_OPTIONS,
    presetId: 'editorial-neon',
    themeId: 'coastal-dusk',
    fontId: 'editorial',
    monochrome: false,
    harmonyHue: 210,
    harmonyMode: 'analogous',
    harmonySurface: 'dark',
    enableExactLineRecurrence: true,
    enableRepeatedPhrases: true,
    enableRepeatedOpeningsEndings: true,
    enableHeuristicPos: true,
    enableDensity: true,
    enablePivotWords: true,
    enableParallelStructure: true,
    enableAlliteration: true,
    enableUnderlines: false,
    enablePhoneticTails: false,
    phraseMinLength: 2,
    phraseMaxLength: 5,
    nearDuplicateThreshold: 0.84,
    relatedThreshold: 0.72,
    maxAnchorsPerLine: 1,
    maxAccentsPerLine: 2,
    minimumStandardTokenRatio: 0.55,
    baseFontScale: 1,
    sizeVariance: 1.15,
    shortLineBoost: 1.22,
    denseLineTighten: 0.88,
    anchorMaxScale: 1.55,
    motifMaxScale: 1.38,
    accentMaxScale: 1.2,
    blockSpacing: 1.35,
    lineSpacing: 0.55,
    centerDriftPct: 8,
  },
};

/** Default VC Pretty Lyrics options for the first stub. */
export const DEFAULT_VC_PRETTY_LYRICS_OPTIONS: PrettyLyricsCompileOptions =
  PRETTY_LYRICS_SAMPLE_1.options;

export const PRETTY_LYRICS_BUILTIN_IDS = ['sample-1'] as const;
export type PrettyLyricsBuiltinId = (typeof PRETTY_LYRICS_BUILTIN_IDS)[number];

export function getBuiltinPrettyLyricsOptions(
  id: PrettyLyricsBuiltinId = 'sample-1',
): PrettyLyricsCompileOptions {
  if (id === 'sample-1') return PRETTY_LYRICS_SAMPLE_1.options;
  return PRETTY_LYRICS_SAMPLE_1.options;
}
