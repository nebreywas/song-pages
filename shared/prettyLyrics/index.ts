/**
 * Pretty Lyrics — text-analysis typography compiler (prototype).
 * @see documentation/pretty-lyrics-prototype.md
 */

export {
  PRETTY_LYRICS_COMPILER_VERSION,
  PRETTY_LYRICS_STYLE_VERSION,
  DEFAULT_PRETTY_LYRICS_OPTIONS,
} from './types';
export type {
  BlockShape,
  LexicalRole,
  LyricTypographyManifest,
  PhraseMotif,
  PrettyLyricsCompileOptions,
  RepetitionGroup,
  StyleReason,
  TokenTypographyRole,
  TypographyBlock,
  TypographyLine,
  TypographyPalette,
  TypographyToken,
} from './types';

export { compileLyricTypography } from './compileLyricTypography';
export { parsePrettyLyricsSource } from './parseSource';
export {
  planPlainLineSoftBreak,
  planPrettyLineSoftBreak,
  softBrokenMaxRowChars,
  SOFT_BREAK_RELATED_SPACING_RATIO,
  SOFT_BREAK_SLOT_HEIGHT_RATIO,
  type SoftBreakOptions,
  type SoftBreakPlan,
} from './softBreak';
export {
  getPrettyLyricsPreset,
  PRETTY_LYRICS_PRESET_IDS,
  PRETTY_LYRICS_PRESETS,
  type PrettyLyricsPreset,
  type PrettyLyricsPresetId,
} from './presets';
export {
  buildHarmonyPalette,
  DEFAULT_PRETTY_LYRICS_THEME_ID,
  getPrettyLyricsThemeMeta,
  HARMONY_MODE_IDS,
  hslToHex,
  PRETTY_LYRICS_THEME_IDS,
  PRETTY_LYRICS_THEMES,
  resolvePrettyLyricsPalette,
  toMonochromePalette,
  type HarmonyMode,
  type PrettyLyricsTheme,
  type PrettyLyricsThemeId,
} from './palettes';
export {
  DEFAULT_PRETTY_LYRICS_FONT_ID,
  getPrettyLyricsFont,
  PRETTY_LYRICS_FONT_IDS,
  PRETTY_LYRICS_FONTS,
  type PrettyLyricsFont,
  type PrettyLyricsFontId,
} from './fonts';
export {
  buildPrettyLyricsExport,
  parsePrettyLyricsExport,
  parsePrettyLyricsExportJson,
  prettyLyricsExportToJson,
  PRETTY_LYRICS_CONFIG_FORMAT,
  PRETTY_LYRICS_CONFIG_FORMAT_VERSION,
  type PrettyLyricsExportedConfig,
} from './exportConfig';
export {
  DEFAULT_VC_PRETTY_LYRICS_OPTIONS,
  getBuiltinPrettyLyricsOptions,
  PRETTY_LYRICS_BUILTIN_IDS,
  PRETTY_LYRICS_SAMPLE_1,
  type PrettyLyricsBuiltinId,
} from './builtins';
export {
  SAMPLE_PRETTY_LYRICS,
  SAMPLE_PRETTY_LYRICS_DENSE,
  SAMPLE_PRETTY_LYRICS_SPARSE,
} from './sampleLyrics';
export { sourceHash } from './hash';
export { isBracketMetadataLine, normalizeForAnalysis } from './normalize';
