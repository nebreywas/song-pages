/**
 * Font packs for Pretty Lyrics Lab — stacks that read well at lyric scale.
 * Uses system / SongPages host faces already loaded in the app when available.
 */

export type PrettyLyricsFontId =
  | 'editorial'
  | 'classic'
  | 'elegant'
  | 'clean'
  | 'poster'
  | 'condensed'
  | 'impact'
  | 'handwritten'
  | 'mono'
  | 'digital'
  | 'retro'
  | 'playful';

export type PrettyLyricsFont = {
  id: PrettyLyricsFontId;
  label: string;
  description: string;
  fontFamily: string;
  /**
   * Optional punchier sibling — promotion target when analysis peaks (display).
   * Same family neighborhood — not a random contrasting face.
   */
  displayFamily?: string;
  /** Optional alternate sibling — mid-expressiveness variance under font-mix. */
  altFamily?: string;
  /** Optional default letter-spacing in em. */
  letterSpacingEm?: number;
};

export const PRETTY_LYRICS_FONTS: Record<PrettyLyricsFontId, PrettyLyricsFont> = {
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    description: 'Literary serif — default lyric feel.',
    fontFamily: '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif',
    displayFamily: 'Georgia, "Iowan Old Style", Palatino, serif',
    altFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'Georgia book serif.',
    fontFamily: 'Georgia, "Times New Roman", serif',
    displayFamily: '"Times New Roman", Times, Georgia, serif',
    altFamily: 'Georgia, "Palatino Linotype", serif',
  },
  elegant: {
    id: 'elegant',
    label: 'Elegant',
    description: 'Didot / Bodoni display serif.',
    fontFamily: 'Didot, "Bodoni 72", "Bodoni MT", Georgia, serif',
    displayFamily: '"Bodoni 72", Didot, "Bodoni MT", Georgia, serif',
    altFamily: 'Didot, Georgia, serif',
    letterSpacingEm: 0.01,
  },
  clean: {
    id: 'clean',
    label: 'Clean',
    description: 'Neutral system sans.',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    displayFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    altFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  poster: {
    id: 'poster',
    label: 'Poster',
    description: 'Heavy display sans for big motif lines.',
    fontFamily: '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif',
    displayFamily: 'Impact, "Arial Black", Helvetica, sans-serif',
    altFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    letterSpacingEm: 0.02,
  },
  condensed: {
    id: 'condensed',
    label: 'Condensed',
    description: 'Narrow sans — good for dense bars.',
    fontFamily: '"Avenir Next Condensed", "Arial Narrow", sans-serif',
    displayFamily: '"Arial Narrow", "Avenir Next Condensed", sans-serif',
    altFamily: '"Avenir Next", "Helvetica Neue", sans-serif',
  },
  impact: {
    id: 'impact',
    label: 'Impact',
    description: 'Shouty condensed display.',
    fontFamily: 'Impact, Haettenschweiler, sans-serif',
    displayFamily: 'Impact, "Arial Black", sans-serif',
    altFamily: 'Haettenschweiler, Impact, sans-serif',
    letterSpacingEm: 0.03,
  },
  handwritten: {
    id: 'handwritten',
    label: 'Handwritten',
    description: 'Soft script (SongPages Handwritten / Caveat).',
    fontFamily: '"SongPages Handwritten", Caveat, cursive',
    displayFamily: 'Caveat, "SongPages Handwritten", cursive',
    altFamily: '"SongPages Handwritten", "Segoe Script", cursive',
  },
  mono: {
    id: 'mono',
    label: 'Mono',
    description: 'Monospace — teletype / chapbook.',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    displayFamily: '"SF Mono", Menlo, ui-monospace, monospace',
    altFamily: 'Menlo, Consolas, "Courier New", monospace',
  },
  digital: {
    id: 'digital',
    label: 'Digital',
    description: 'Tech display (Orbitron stack).',
    fontFamily: '"SongPages Digital", Orbitron, ui-monospace, monospace',
    displayFamily: 'Orbitron, "SongPages Digital", monospace',
    altFamily: '"SongPages Digital", ui-monospace, monospace',
    letterSpacingEm: 0.04,
  },
  retro: {
    id: 'retro',
    label: 'Retro',
    description: 'Blocky display (Bungee stack).',
    fontFamily: '"SongPages Retro", Bungee, Impact, sans-serif',
    displayFamily: 'Bungee, "SongPages Retro", Impact, sans-serif',
    altFamily: '"SongPages Retro", Impact, sans-serif',
  },
  playful: {
    id: 'playful',
    label: 'Playful',
    description: 'Rounded soft sans.',
    fontFamily: '"SongPages Playful", "Baloo 2", system-ui, sans-serif',
    displayFamily: '"Baloo 2", "SongPages Playful", system-ui, sans-serif',
    altFamily: '"SongPages Playful", "Segoe UI", sans-serif',
  },
};

export const PRETTY_LYRICS_FONT_IDS = Object.keys(PRETTY_LYRICS_FONTS) as PrettyLyricsFontId[];

export const DEFAULT_PRETTY_LYRICS_FONT_ID: PrettyLyricsFontId = 'editorial';

export function getPrettyLyricsFont(id: string): PrettyLyricsFont {
  if (id in PRETTY_LYRICS_FONTS) return PRETTY_LYRICS_FONTS[id as PrettyLyricsFontId];
  return PRETTY_LYRICS_FONTS.editorial;
}
