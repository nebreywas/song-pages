/**
 * Stub Pretty Lyrics style for the listener song-page preview.
 * Player settings will later own the default; this export is the temporary hand-off.
 */

import {
  parsePrettyLyricsExport,
  type PrettyLyricsExportedConfig,
} from '../prettyLyrics/exportConfig';
import type { PrettyLyricsCompileOptions } from '../prettyLyrics/types';
import { DEFAULT_PRETTY_LYRICS_OPTIONS } from '../prettyLyrics/types';

/** Lab export used until listener player settings own a Pretty Lyrics default. */
export const LISTENER_DEFAULT_PRETTY_LYRICS_EXPORT: PrettyLyricsExportedConfig = {
  format: 'songpages.pretty-lyrics-config',
  formatVersion: 1,
  name: 'pretty-lyrics-default',
  exportedAt: '2026-07-15T10:48:15.459Z',
  compilerVersion: 1,
  styleVersion: 1,
  options: {
    ...DEFAULT_PRETTY_LYRICS_OPTIONS,
    presetId: 'dense-magazine',
    themeId: 'rose-copper',
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
    enableItalics: false,
    enableGlow: false,
    glowIntensity: 1,
    enableFontMix: false,
    fontMixStrength: 1,
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
    // Before/after both apply between blocks — keep this modest on song pages.
    blockSpacing: 0.55,
    lineSpacing: 0.55,
    wordSpacingEm: 0,
    // Dense magazine is left-justified — no seeded center drift.
    centerDriftPct: 0,
  },
};

const parsed = parsePrettyLyricsExport(LISTENER_DEFAULT_PRETTY_LYRICS_EXPORT);

/** Compile options for listener Pretty Lyrics (merged with library defaults). */
export const LISTENER_DEFAULT_PRETTY_LYRICS_OPTIONS: PrettyLyricsCompileOptions = parsed.ok
  ? parsed.config.options
  : LISTENER_DEFAULT_PRETTY_LYRICS_EXPORT.options;
