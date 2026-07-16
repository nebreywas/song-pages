/**
 * Compatible color themes for Pretty Lyrics.
 *
 * Layout presets stay separate — a theme supplies a coherent field + accent family.
 * Motif / accent slots come from one harmonic set so choruses don't look like
 * unrelated neon stickers.
 */

import type { TypographyPalette } from './types';

export type PrettyLyricsThemeId =
  | 'coastal-dusk'
  | 'ink-amber'
  | 'paper-ink'
  | 'forest-ember'
  | 'arctic-signal'
  | 'rose-copper'
  | 'graphite'
  | 'midnight-gold'
  | 'citrus-noir'
  | 'plum-mist'
  | 'sage-slate'
  | 'coral-ink'
  | 'bone-charcoal'
  | 'oxblood-cream'
  | 'harmony';

export type HarmonyMode = 'analogous' | 'triadic' | 'complementary' | 'split-complementary';

export type PrettyLyricsTheme = {
  id: PrettyLyricsThemeId;
  label: string;
  description: string;
  /** Fixed curated palette — unused when id === 'harmony'. */
  palette?: TypographyPalette;
};

/** Clamp channel to 0–255 and emit #rrggbb. */
function rgbHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** HSL → hex. h in degrees, s/l in 0–1. */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function hueSet(base: number, mode: HarmonyMode): number[] {
  const h = ((base % 360) + 360) % 360;
  switch (mode) {
    case 'analogous':
      // Tight neighbors — calm, lyric-friendly.
      return [h, h - 24, h + 24, h - 48, h + 48].map((v) => (v + 360) % 360);
    case 'triadic':
      return [h, h + 120, h + 240, h + 40, h + 160].map((v) => (v + 360) % 360);
    case 'complementary':
      return [h, h + 180, h + 30, h + 150, h - 30].map((v) => (v + 360) % 360);
    case 'split-complementary':
      return [h, h + 150, h + 210, h + 20, h - 20].map((v) => (v + 360) % 360);
    default:
      return [h, h + 30, h - 30];
  }
}

/**
 * Build a full typography palette from one seed hue + harmony mode.
 * Dark and light surfaces keep accent chroma in a readable band.
 */
export function buildHarmonyPalette(input: {
  hue: number;
  mode: HarmonyMode;
  surface: 'dark' | 'light';
  id?: string;
  label?: string;
}): TypographyPalette {
  const hues = hueSet(input.hue, input.mode);
  const dark = input.surface === 'dark';

  const background = dark ? hslToHex(hues[0]!, 0.18, 0.07) : hslToHex(hues[0]!, 0.12, 0.94);
  const base = dark ? hslToHex(hues[0]!, 0.08, 0.9) : hslToHex(hues[0]!, 0.1, 0.12);
  const quiet = dark ? hslToHex(hues[0]!, 0.08, 0.58) : hslToHex(hues[0]!, 0.06, 0.42);

  // Shared lightness/chroma keeps accents compatible with each other.
  const accentL = dark ? 0.68 : 0.42;
  const motifL = dark ? 0.62 : 0.38;
  const sat = dark ? 0.55 : 0.48;

  const accents = hues.slice(0, 4).map((hh, i) => hslToHex(hh, sat - i * 0.03, accentL));
  const motifs = hues.map((hh, i) => hslToHex(hh, sat - 0.05 - i * 0.02, motifL));
  const underline = motifs.slice(0, 3);

  return {
    id: input.id ?? `harmony-${input.mode}-${Math.round(input.hue)}`,
    label: input.label ?? `Harmony ${input.mode} @ ${Math.round(input.hue)}°`,
    background,
    base,
    quiet,
    accents,
    motifs,
    underline,
  };
}

/**
 * Curated themes — hand-checked for field/accent compatibility.
 * Motif arrays are ordered: primary refrain → secondary → tertiary…
 */
export const PRETTY_LYRICS_THEMES: Record<Exclude<PrettyLyricsThemeId, 'harmony'>, PrettyLyricsTheme> = {
  'coastal-dusk': {
    id: 'coastal-dusk',
    label: 'Coastal Dusk',
    description: 'Deep navy field with sea-glass / sky / foam accents (analogous cool).',
    palette: {
      id: 'coastal-dusk',
      label: 'Coastal Dusk',
      background: '#0b1219',
      base: '#e6eef6',
      quiet: '#7e8fa3',
      accents: ['#7eb8d4', '#c4dde8', '#9fd4c2', '#f0d9a8'],
      motifs: ['#6eb0cf', '#8fc9b8', '#b7cfe0', '#e8c894', '#a8bfd4'],
      underline: ['#6eb0cf', '#8fc9b8', '#e8c894'],
    },
  },
  'ink-amber': {
    id: 'ink-amber',
    label: 'Ink & Amber',
    description: 'Warm charcoal with amber / copper / cream — restrained complementary warmth.',
    palette: {
      id: 'ink-amber',
      label: 'Ink & Amber',
      background: '#12100e',
      base: '#f3ebe1',
      quiet: '#9a8f84',
      accents: ['#e0a45a', '#c47848', '#f0dcc0', '#c4a484'],
      motifs: ['#e0a45a', '#c47848', '#ddc09a', '#a87858', '#f0dcc0'],
      underline: ['#e0a45a', '#c47848', '#ddc09a'],
    },
  },
  'paper-ink': {
    id: 'paper-ink',
    label: 'Paper & Ink',
    description: 'Warm paper with ink black, terracotta, and one cool blue for contrast.',
    palette: {
      id: 'paper-ink',
      label: 'Paper & Ink',
      background: '#f3efe6',
      base: '#1c1916',
      quiet: '#6f6860',
      accents: ['#a9442e', '#1f4f7a', '#2f6b4f', '#8a6a3d'],
      motifs: ['#a9442e', '#1f4f7a', '#2f6b4f', '#8a6a3d', '#5c4a3a'],
      underline: ['#a9442e', '#1f4f7a', '#2f6b4f'],
    },
  },
  'forest-ember': {
    id: 'forest-ember',
    label: 'Forest Ember',
    description: 'Mossy dark green field; ember + leaf accents (split-complement feel).',
    palette: {
      id: 'forest-ember',
      label: 'Forest Ember',
      background: '#0d1410',
      base: '#e7efe8',
      quiet: '#7e9084',
      accents: ['#d4895a', '#7faf8a', '#e2c78a', '#9bbdb0'],
      motifs: ['#7faf8a', '#d4895a', '#9bbdb0', '#e2c78a', '#b8a07a'],
      underline: ['#7faf8a', '#d4895a', '#e2c78a'],
    },
  },
  'arctic-signal': {
    id: 'arctic-signal',
    label: 'Arctic Signal',
    description: 'Nord-like cool neutrals with frost cyan and soft signal colors.',
    palette: {
      id: 'arctic-signal',
      label: 'Arctic Signal',
      background: '#0f1419',
      base: '#eceff4',
      quiet: '#7b8696',
      accents: ['#88c0d0', '#81a1c1', '#a3be8c', '#ebcb8b'],
      motifs: ['#88c0d0', '#81a1c1', '#a3be8c', '#d08770', '#b48ead'],
      underline: ['#88c0d0', '#81a1c1', '#a3be8c'],
    },
  },
  'rose-copper': {
    id: 'rose-copper',
    label: 'Rose Copper',
    description: 'Muted mauve field; rose, copper, and dusty gold (warm analogous).',
    palette: {
      id: 'rose-copper',
      label: 'Rose Copper',
      background: '#161116',
      base: '#f2e8ea',
      quiet: '#978890',
      accents: ['#d4a0a8', '#c48464', '#e2c4a0', '#b090a0'],
      motifs: ['#d4a0a8', '#c48464', '#e2c4a0', '#b090a0', '#9a7068'],
      underline: ['#d4a0a8', '#c48464', '#e2c4a0'],
    },
  },
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    description: 'Near-monochrome: graphite field with tone steps — maximum restraint.',
    palette: {
      id: 'graphite',
      label: 'Graphite',
      background: '#101214',
      base: '#e8eaed',
      quiet: '#8a9098',
      accents: ['#c5cad1', '#9aa3ad', '#dde1e6', '#6f7780'],
      motifs: ['#c5cad1', '#9aa3ad', '#dde1e6', '#6f7780', '#b0b6be'],
      underline: ['#c5cad1', '#9aa3ad', '#dde1e6'],
    },
  },
  'midnight-gold': {
    id: 'midnight-gold',
    label: 'Midnight Gold',
    description: 'Near-black field with champagne / antique gold accents.',
    palette: {
      id: 'midnight-gold',
      label: 'Midnight Gold',
      background: '#0a0a0c',
      base: '#f2ead8',
      quiet: '#8a8274',
      accents: ['#d4b56a', '#f0e2b8', '#a89058', '#c9b896'],
      motifs: ['#d4b56a', '#f0e2b8', '#a89058', '#c9b896', '#e8d9a8'],
      underline: ['#d4b56a', '#a89058', '#f0e2b8'],
    },
  },
  'citrus-noir': {
    id: 'citrus-noir',
    label: 'Citrus Noir',
    description: 'Dark olive-black with lemon, lime, and bitter orange.',
    palette: {
      id: 'citrus-noir',
      label: 'Citrus Noir',
      background: '#10140c',
      base: '#f2f0e4',
      quiet: '#8a8f7a',
      accents: ['#e8c84a', '#a8c95a', '#e09a3c', '#c8d090'],
      motifs: ['#e8c84a', '#a8c95a', '#e09a3c', '#c8d090', '#d4b070'],
      underline: ['#e8c84a', '#a8c95a', '#e09a3c'],
    },
  },
  'plum-mist': {
    id: 'plum-mist',
    label: 'Plum Mist',
    description: 'Cool plum field with lilac, frost, and wine accents.',
    palette: {
      id: 'plum-mist',
      label: 'Plum Mist',
      background: '#141018',
      base: '#efe8f2',
      quiet: '#908498',
      accents: ['#c4a0d4', '#a890c0', '#e0c8e8', '#b07090'],
      motifs: ['#c4a0d4', '#a890c0', '#e0c8e8', '#b07090', '#d0b0c8'],
      underline: ['#c4a0d4', '#a890c0', '#b07090'],
    },
  },
  'sage-slate': {
    id: 'sage-slate',
    label: 'Sage Slate',
    description: 'Cool gray-green field; sage, stone, and soft clay.',
    palette: {
      id: 'sage-slate',
      label: 'Sage Slate',
      background: '#121614',
      base: '#e8eee9',
      quiet: '#84908a',
      accents: ['#9ab8a4', '#b8c8bc', '#c4b09a', '#7a9888'],
      motifs: ['#9ab8a4', '#b8c8bc', '#c4b09a', '#7a9888', '#a8b8ac'],
      underline: ['#9ab8a4', '#c4b09a', '#7a9888'],
    },
  },
  'coral-ink': {
    id: 'coral-ink',
    label: 'Coral Ink',
    description: 'Light paper with coral, ink navy, and warm gray.',
    palette: {
      id: 'coral-ink',
      label: 'Coral Ink',
      background: '#f7f0ea',
      base: '#1a1820',
      quiet: '#6e6870',
      accents: ['#d4604a', '#1a3a5c', '#c49070', '#4a6070'],
      motifs: ['#d4604a', '#1a3a5c', '#c49070', '#4a6070', '#8a6070'],
      underline: ['#d4604a', '#1a3a5c', '#c49070'],
    },
  },
  'bone-charcoal': {
    id: 'bone-charcoal',
    label: 'Bone & Charcoal',
    description: 'Warm bone paper, charcoal type, ash accents — print chapbook.',
    palette: {
      id: 'bone-charcoal',
      label: 'Bone & Charcoal',
      background: '#ebe6dc',
      base: '#1c1c1c',
      quiet: '#6e6a64',
      accents: ['#3a3a3a', '#5c5852', '#2a2a2a', '#8a8680'],
      motifs: ['#3a3a3a', '#5c5852', '#2a2a2a', '#8a8680', '#4a4640'],
      underline: ['#3a3a3a', '#5c5852', '#8a8680'],
    },
  },
  'oxblood-cream': {
    id: 'oxblood-cream',
    label: 'Oxblood Cream',
    description: 'Cream field with oxblood, rust, and tobacco.',
    palette: {
      id: 'oxblood-cream',
      label: 'Oxblood Cream',
      background: '#f5efe4',
      base: '#1f1512',
      quiet: '#7a6860',
      accents: ['#8a1c28', '#a84830', '#6a3028', '#c07048'],
      motifs: ['#8a1c28', '#a84830', '#6a3028', '#c07048', '#905040'],
      underline: ['#8a1c28', '#a84830', '#c07048'],
    },
  },
};

export const PRETTY_LYRICS_THEME_IDS: PrettyLyricsThemeId[] = [
  ...Object.keys(PRETTY_LYRICS_THEMES),
  'harmony',
] as PrettyLyricsThemeId[];

export const HARMONY_MODE_IDS: HarmonyMode[] = [
  'analogous',
  'triadic',
  'complementary',
  'split-complementary',
];

export const DEFAULT_PRETTY_LYRICS_THEME_ID: PrettyLyricsThemeId = 'coastal-dusk';

/** Default layout preset → suggested theme (can still be overridden in the lab). */
export const PRESET_DEFAULT_THEME: Record<string, PrettyLyricsThemeId> = {
  'editorial-neon': 'coastal-dusk',
  poster: 'ink-amber',
  'dense-magazine': 'paper-ink',
};

/**
 * Force a palette into monochrome while keeping relative lightness roles.
 * Works as an overlay on any curated / harmony theme.
 */
export function toMonochromePalette(palette: TypographyPalette): TypographyPalette {
  const gray = (hex: string): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1]!, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    // Rec. 709 luminance — preserve contrast structure without hue.
    const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const to = (c: number) => c.toString(16).padStart(2, '0');
    return `#${to(y)}${to(y)}${to(y)}`;
  };

  return {
    ...palette,
    id: `${palette.id}-mono`,
    label: `${palette.label} (Mono)`,
    background: gray(palette.background),
    base: gray(palette.base),
    quiet: gray(palette.quiet),
    accents: palette.accents.map(gray),
    motifs: palette.motifs.map(gray),
    underline: palette.underline.map(gray),
  };
}

export function resolvePrettyLyricsPalette(input: {
  themeId?: string;
  harmonyHue?: number;
  harmonyMode?: HarmonyMode;
  harmonySurface?: 'dark' | 'light';
  /** Collapse any theme to luminance-only (monochrome overlay). */
  monochrome?: boolean;
  /** Fallback when theme missing. */
  fallback?: TypographyPalette;
}): TypographyPalette {
  const themeId = (input.themeId ?? DEFAULT_PRETTY_LYRICS_THEME_ID) as PrettyLyricsThemeId;

  let palette: TypographyPalette;
  if (themeId === 'harmony') {
    palette = buildHarmonyPalette({
      hue: input.harmonyHue ?? 210,
      mode: input.harmonyMode ?? 'analogous',
      surface: input.harmonySurface ?? 'dark',
      label: `Harmony ${(input.harmonyMode ?? 'analogous')} @ ${Math.round(input.harmonyHue ?? 210)}°`,
    });
  } else {
    const curated = PRETTY_LYRICS_THEMES[themeId as Exclude<PrettyLyricsThemeId, 'harmony'>];
    palette = curated?.palette ?? input.fallback ?? PRETTY_LYRICS_THEMES['coastal-dusk'].palette!;
  }

  return input.monochrome ? toMonochromePalette(palette) : palette;
}

export function getPrettyLyricsThemeMeta(themeId: string): { label: string; description: string } {
  if (themeId === 'harmony') {
    return {
      label: 'Harmony (generated)',
      description: 'Build a compatible family from one hue + harmony mode (HSL).',
    };
  }
  const t = PRETTY_LYRICS_THEMES[themeId as Exclude<PrettyLyricsThemeId, 'harmony'>];
  return t
    ? { label: t.label, description: t.description }
    : { label: themeId, description: '' };
}
