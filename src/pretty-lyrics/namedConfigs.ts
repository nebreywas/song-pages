/**
 * Persist named Pretty Lyrics lab configurations in localStorage.
 * Prototype only — not yet a first-class app setting.
 */

import {
  DEFAULT_PRETTY_LYRICS_OPTIONS,
  type PrettyLyricsCompileOptions,
} from '@shared/prettyLyrics';

const STORAGE_KEY = 'songpages:pretty-lyrics-named-configs';

export type PrettyLyricsNamedConfig = {
  id: string;
  name: string;
  savedAt: string;
  options: PrettyLyricsCompileOptions;
};

function readAll(): PrettyLyricsNamedConfig[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrettyLyricsNamedConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(configs: PrettyLyricsNamedConfig[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function listPrettyLyricsNamedConfigs(): PrettyLyricsNamedConfig[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function savePrettyLyricsNamedConfig(
  name: string,
  options: PrettyLyricsCompileOptions,
): PrettyLyricsNamedConfig {
  const configs = readAll();
  const existing = configs.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  const entry: PrettyLyricsNamedConfig = {
    id: existing?.id ?? `cfg-${Date.now().toString(36)}`,
    name: name.trim() || 'Untitled',
    savedAt: new Date().toISOString(),
    options: { ...DEFAULT_PRETTY_LYRICS_OPTIONS, ...options },
  };
  const next = existing
    ? configs.map((c) => (c.id === existing.id ? entry : c))
    : [entry, ...configs];
  writeAll(next);
  return entry;
}

export function deletePrettyLyricsNamedConfig(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}
