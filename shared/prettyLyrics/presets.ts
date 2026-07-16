/** Layout composers — color comes from {@link ./palettes.ts} themes. */

import { PRESET_DEFAULT_THEME } from './palettes';
import type { TypographyPalette } from './types';

export type PrettyLyricsPresetId = 'editorial-neon' | 'poster' | 'dense-magazine';

export type PrettyLyricsPreset = {
  id: PrettyLyricsPresetId;
  label: string;
  description: string;
  /** Legacy embedded palette — prefer resolvePrettyLyricsPalette(themeId). */
  palette: TypographyPalette;
  /** Prefer weight over size for accents. */
  weightFirst: boolean;
  centerRepeatedBlocks: boolean;
  strongSizeHierarchy: boolean;
  /** Suggested companion theme when the lab first selects this preset. */
  defaultThemeId: string;
};

export const PRETTY_LYRICS_PRESETS: Record<PrettyLyricsPresetId, PrettyLyricsPreset> = {
  'editorial-neon': {
    id: 'editorial-neon',
    label: 'Editorial',
    description: 'Flexible hierarchy, centered repeats, moderate scale.',
    weightFirst: false,
    centerRepeatedBlocks: true,
    strongSizeHierarchy: false,
    defaultThemeId: PRESET_DEFAULT_THEME['editorial-neon']!,
    // Fallback only — themes override at compile time.
    palette: {
      id: 'editorial-neon-fallback',
      label: 'Editorial fallback',
      background: '#0b0d12',
      base: '#e8ecf4',
      quiet: '#8b93a7',
      accents: ['#7eb8d4', '#c4dde8', '#9fd4c2', '#f0d9a8'],
      motifs: ['#6eb0cf', '#8fc9b8', '#b7cfe0', '#e8c894', '#a8bfd4'],
      underline: ['#6eb0cf', '#8fc9b8', '#e8c894'],
    },
  },
  poster: {
    id: 'poster',
    label: 'Poster',
    description: 'Stronger size hierarchy, centered repeated blocks.',
    weightFirst: false,
    centerRepeatedBlocks: true,
    strongSizeHierarchy: true,
    defaultThemeId: PRESET_DEFAULT_THEME.poster!,
    palette: {
      id: 'poster-fallback',
      label: 'Poster fallback',
      background: '#14110f',
      base: '#f5efe6',
      quiet: '#9a9086',
      accents: ['#e0a45a', '#c47848'],
      motifs: ['#e0a45a', '#c47848', '#ddc09a'],
      underline: ['#e0a45a', '#c47848'],
    },
  },
  'dense-magazine': {
    id: 'dense-magazine',
    label: 'Dense Magazine',
    description: 'Left-aligned, restrained size, strong weight hierarchy.',
    weightFirst: true,
    centerRepeatedBlocks: false,
    strongSizeHierarchy: false,
    defaultThemeId: PRESET_DEFAULT_THEME['dense-magazine']!,
    palette: {
      id: 'dense-magazine-fallback',
      label: 'Magazine fallback',
      background: '#f4f1ea',
      base: '#1a1a1a',
      quiet: '#6b6560',
      accents: ['#a9442e', '#1f4f7a'],
      motifs: ['#a9442e', '#1f4f7a', '#2f6b4f'],
      underline: ['#a9442e', '#1f4f7a'],
    },
  },
};

export function getPrettyLyricsPreset(id: string): PrettyLyricsPreset {
  if (id in PRETTY_LYRICS_PRESETS) {
    return PRETTY_LYRICS_PRESETS[id as PrettyLyricsPresetId];
  }
  return PRETTY_LYRICS_PRESETS['editorial-neon'];
}

export const PRETTY_LYRICS_PRESET_IDS = Object.keys(
  PRETTY_LYRICS_PRESETS,
) as PrettyLyricsPresetId[];
