/**
 * Default Song Card structure + per-design labels.
 *
 * Designs are skins/motifs first — structure defaults are only a starting point
 * so each template looks intentional when selected. Artists (and we) still
 * override content choices in the designer.
 *
 * Reference sheet: documentation/assets/song-cards-vertical-230x300-reference.png
 */

import type { SongCardDesignId, SongCardStructure } from './types';

export const SONG_CARD_DESIGN_IDS: SongCardDesignId[] = [1, 2, 3, 4, 5, 6, 7];

export const SONG_CARD_DESIGN_META: Record<
  SongCardDesignId,
  { name: string; blurb: string }
> = {
  1: {
    name: 'Classic',
    blurb: 'Clean light field · quiet type · baseline skin',
  },
  2: {
    name: 'Broadcast',
    blurb: 'Teal night console · inset cover · cyan signal accents',
  },
  3: {
    name: 'Poster',
    blurb: 'Billboard type · sharp corners · coral play · stacked caps',
  },
  4: {
    name: 'Parchment',
    blurb: 'Warm paper field · quote marks · lyric-forward',
  },
  5: {
    name: 'Neon',
    blurb: 'Night field · magenta / lime signal · crisp glow chrome',
  },
  6: {
    name: 'Nocturne',
    blurb: 'Black field · amber rule · outline tags',
  },
  7: {
    name: 'Organic',
    blurb: 'Soft moss & clay · rounded chrome · earthy stamps',
  },
};

/** Shared baseline — Classic corners / play treatment. */
export function defaultSongCardStructure(): SongCardStructure {
  return {
    designId: 1,
    // ~ half of 300px → square-ish cover on a 230-wide card
    coverHeightRatio: 0.48,
    animatedCover: {
      preference: 'prefer-animated',
      trigger: 'when-in-view',
      loop: 'loop',
    },
    corners: {
      topLeft: 'none',
      topRight: 'none',
      bottomLeft: 'play',
      bottomRight: 'length',
    },
    coverBugsPlacement: 'overlay',
    likeStyle: 'heart',
    playSize: 'normal',
    playFill: 'filled',
    coverBlend: 'none',
    coverBorder: false,
    info: {
      showCaption: false,
      showSubtitle: false,
      showGenres: false,
      showThemes: false,
      showLyricQuote: false,
      lyricQuoteOverflow: 'clamp',
      genreThemeRender: 'pills-round',
    },
    footer: {
      left: 'track-number',
      center: [],
      menuStyle: 'dots-h',
      explicitFormat: 'E',
      showSeparator: false,
      shadeFooter: false,
      playingAnim: 'none',
    },
  };
}

/**
 * Per-design starting structure — tuned to suit each skin’s motif,
 * not as the identity of the design itself.
 */
export function structureForDesign(designId: SongCardDesignId): SongCardStructure {
  const base = defaultSongCardStructure();
  base.designId = designId;

  switch (designId) {
    case 1:
      return base;

    case 2: // Broadcast — console chrome, inset art
      return {
        ...base,
        coverHeightRatio: 0.44,
        coverBugsPlacement: 'outside',
        coverBorder: true,
        coverBlend: 'dark',
        playFill: 'filled',
        corners: {
          topLeft: 'none',
          topRight: 'like',
          bottomLeft: 'play',
          bottomRight: 'length',
        },
        info: {
          ...base.info,
          showSubtitle: true,
          showGenres: true,
          genreThemeRender: 'pills-rect',
        },
        footer: {
          ...base.footer,
          left: 'none',
          center: ['length', 'creation-date'],
          menuStyle: 'dots-v',
          playingAnim: 'waveform',
          shadeFooter: true,
        },
      };

    case 3: // Poster — tall cover, bold identity, sparse chrome
      return {
        ...base,
        coverHeightRatio: 0.56,
        coverBlend: 'middle',
        playFill: 'filled',
        playSize: 'outside',
        corners: {
          topLeft: 'none',
          topRight: 'explicit',
          bottomLeft: 'play',
          bottomRight: 'none',
        },
        info: {
          ...base.info,
          showCaption: true,
          showGenres: true,
          genreThemeRender: 'text',
        },
        footer: {
          ...base.footer,
          left: 'track-number',
          center: ['creation-date'],
          menuStyle: 'dots-h',
          explicitFormat: 'Explicit',
          showSeparator: true,
          playingAnim: 'none',
        },
      };

    case 4: // Parchment — lyric-forward paper
      return {
        ...base,
        coverHeightRatio: 0.38,
        corners: {
          topLeft: 'none',
          topRight: 'length',
          bottomLeft: 'play',
          bottomRight: 'none',
        },
        info: {
          ...base.info,
          showLyricQuote: true,
          showGenres: true,
          lyricQuoteOverflow: 'clamp',
          genreThemeRender: 'pills-round',
        },
        footer: {
          ...base.footer,
          left: 'explicit',
          center: ['length', 'creation-date'],
          menuStyle: 'dots-h',
          explicitFormat: 'E',
          playingAnim: 'none',
        },
      };

    case 5: // Neon — night + signal chrome
      return {
        ...base,
        coverHeightRatio: 0.46,
        coverBlend: 'dark',
        playFill: 'filled',
        corners: {
          topLeft: 'none',
          topRight: 'length',
          bottomLeft: 'play',
          bottomRight: 'none',
        },
        info: {
          ...base.info,
          showSubtitle: true,
          showGenres: true,
          genreThemeRender: 'pills-rect',
        },
        footer: {
          ...base.footer,
          left: 'none',
          center: ['length', 'creation-date'],
          menuStyle: 'dots-h',
          playingAnim: 'freq-bars',
          shadeFooter: true,
        },
      };

    case 6: // Nocturne — dark amber
      return {
        ...base,
        coverHeightRatio: 0.42,
        coverBlend: 'middle',
        corners: {
          topLeft: 'none',
          topRight: 'length',
          bottomLeft: 'play',
          bottomRight: 'none',
        },
        info: {
          ...base.info,
          showCaption: true,
          showGenres: true,
          genreThemeRender: 'pills-rect',
        },
        footer: {
          ...base.footer,
          left: 'none',
          center: ['creation-date'],
          menuStyle: 'dots-h',
          playingAnim: 'waveform',
        },
      };

    case 7: // Organic — soft moss / clay
      return {
        ...base,
        coverHeightRatio: 0.44,
        coverBugsPlacement: 'overlay',
        coverBlend: 'light',
        playFill: 'filled',
        corners: {
          topLeft: 'none',
          topRight: 'like',
          bottomLeft: 'play',
          bottomRight: 'length',
        },
        info: {
          ...base.info,
          showCaption: true,
          showGenres: true,
          showThemes: true,
          genreThemeRender: 'pills-round',
        },
        footer: {
          ...base.footer,
          left: 'none',
          center: ['creation-date', 'main-genre'],
          menuStyle: 'dots-h',
          showSeparator: false,
          playingAnim: 'none',
        },
      };

    default:
      return base;
  }
}

/** Corner bug labels for the 2×2 designer grid. */
export const COVER_CORNER_BUG_OPTIONS: Array<{
  id: import('./types').CoverCornerBug;
  label: string;
}> = [
  { id: 'none', label: 'None' },
  { id: 'explicit', label: 'Explicit' },
  { id: 'play', label: 'Play' },
  { id: 'like', label: 'Like' },
  { id: 'length', label: 'Length' },
];
