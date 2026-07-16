/**
 * Stable export of Pretty Lyrics lab settings for hand-off into VC / named defaults.
 * Version the envelope so future fields don't break older JSON files.
 */

import {
  DEFAULT_PRETTY_LYRICS_OPTIONS,
  PRETTY_LYRICS_COMPILER_VERSION,
  PRETTY_LYRICS_STYLE_VERSION,
  type PrettyLyricsCompileOptions,
} from './types';

export const PRETTY_LYRICS_CONFIG_FORMAT = 'songpages.pretty-lyrics-config' as const;
export const PRETTY_LYRICS_CONFIG_FORMAT_VERSION = 1;

export type PrettyLyricsExportedConfig = {
  format: typeof PRETTY_LYRICS_CONFIG_FORMAT;
  formatVersion: number;
  /** Human label from the lab export dialog. */
  name: string;
  exportedAt: string;
  /** Compiler/style versions that produced looks matching this tune. */
  compilerVersion: number;
  styleVersion: number;
  options: PrettyLyricsCompileOptions;
};

export function buildPrettyLyricsExport(
  options: PrettyLyricsCompileOptions,
  name = 'Untitled',
): PrettyLyricsExportedConfig {
  return {
    format: PRETTY_LYRICS_CONFIG_FORMAT,
    formatVersion: PRETTY_LYRICS_CONFIG_FORMAT_VERSION,
    name: name.trim() || 'Untitled',
    exportedAt: new Date().toISOString(),
    compilerVersion: PRETTY_LYRICS_COMPILER_VERSION,
    styleVersion: PRETTY_LYRICS_STYLE_VERSION,
    options: { ...DEFAULT_PRETTY_LYRICS_OPTIONS, ...options },
  };
}

export function prettyLyricsExportToJson(config: PrettyLyricsExportedConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * Accepts a full export envelope or a bare options object (paste-friendly).
 * Unknown keys are ignored via defaults merge.
 */
export function parsePrettyLyricsExport(raw: unknown): {
  ok: true;
  config: PrettyLyricsExportedConfig;
} | { ok: false; error: string } {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, error: 'Expected a JSON object.' };
  }

  const value = raw as Record<string, unknown>;

  // Bare options paste — treat as options only.
  if (value.format == null && (value.presetId != null || value.themeId != null)) {
    const options = {
      ...DEFAULT_PRETTY_LYRICS_OPTIONS,
      ...(value as Partial<PrettyLyricsCompileOptions>),
    };
    return {
      ok: true,
      config: buildPrettyLyricsExport(options, 'Imported options'),
    };
  }

  if (value.format !== PRETTY_LYRICS_CONFIG_FORMAT) {
    return {
      ok: false,
      error: `Unknown format (expected ${PRETTY_LYRICS_CONFIG_FORMAT}).`,
    };
  }

  if (typeof value.formatVersion !== 'number') {
    return { ok: false, error: 'Missing formatVersion.' };
  }

  const optionsRaw = value.options;
  if (optionsRaw == null || typeof optionsRaw !== 'object') {
    return { ok: false, error: 'Missing options object.' };
  }

  const options = {
    ...DEFAULT_PRETTY_LYRICS_OPTIONS,
    ...(optionsRaw as Partial<PrettyLyricsCompileOptions>),
  };

  return {
    ok: true,
    config: {
      format: PRETTY_LYRICS_CONFIG_FORMAT,
      formatVersion: value.formatVersion,
      name: typeof value.name === 'string' ? value.name : 'Imported',
      exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
      compilerVersion:
        typeof value.compilerVersion === 'number'
          ? value.compilerVersion
          : PRETTY_LYRICS_COMPILER_VERSION,
      styleVersion:
        typeof value.styleVersion === 'number' ? value.styleVersion : PRETTY_LYRICS_STYLE_VERSION,
      options,
    },
  };
}

export function parsePrettyLyricsExportJson(text: string): ReturnType<typeof parsePrettyLyricsExport> {
  try {
    return parsePrettyLyricsExport(JSON.parse(text));
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
}
