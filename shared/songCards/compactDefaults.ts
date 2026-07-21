/**
 * Compact Rectangle defaults + per-skin starting structure.
 */

import type {
  CompactRectangleDesignId,
  CompactRectangleStructure,
} from './compactTypes';

export const COMPACT_RECTANGLE_DESIGN_IDS: CompactRectangleDesignId[] = [
  1, 2, 3, 4,
];

export const COMPACT_RECTANGLE_DESIGN_META: Record<
  CompactRectangleDesignId,
  { name: string; blurb: string }
> = {
  1: {
    name: 'Editorial Light',
    blurb: 'Cover left · caption · soft pills · track # footer',
  },
  2: {
    name: 'Signal Dark',
    blurb: 'Cover right · lyric quote · outline tags · night field',
  },
  3: {
    name: 'Rail',
    blurb: 'Cover left · dense meta rail · accent underline title',
  },
  4: {
    name: 'Moss Strip',
    blurb: 'Organic horizontal · soft cover frame · earthy stamps',
  },
};

export function defaultCompactRectangleStructure(): CompactRectangleStructure {
  return {
    designId: 1,
    coverSide: 'left',
    playPlacement: 'lower-left',
    coverBugs: { like: false, length: false, explicit: false },
    animatedCover: {
      preference: 'prefer-animated',
      trigger: 'when-in-view',
      loop: 'loop',
    },
    coverBlend: 'none',
    coverBorder: false,
    info: {
      showAlbum: true,
      showSubtitle: false,
      showCaption: true,
      showLyricQuote: false,
      showGenres: true,
      showThemes: false,
      showHeaderActions: true,
      lyricQuoteOverflow: 'clamp',
      genreThemeRender: 'pills-round',
    },
    footer: {
      left: 'track-number',
      center: ['length', 'bitrate', 'creation-date'],
      menuStyle: 'dots-v',
      explicitFormat: 'E',
      showSeparator: true,
      shadeFooter: false,
      playingAnim: 'waveform',
      showLikeAction: false,
      showAddAction: true,
      showPlayLink: true,
    },
  };
}

export function structureForCompactDesign(
  designId: CompactRectangleDesignId,
): CompactRectangleStructure {
  const base = defaultCompactRectangleStructure();
  base.designId = designId;

  switch (designId) {
    case 1:
      return base;

    case 2:
      return {
        ...base,
        coverSide: 'right',
        playPlacement: 'lower-left',
        coverBugs: { like: true, length: false, explicit: false },
        coverBlend: 'dark',
        info: {
          ...base.info,
          showCaption: false,
          showLyricQuote: true,
          showHeaderActions: false,
          genreThemeRender: 'pills-round',
        },
        footer: {
          ...base.footer,
          left: 'none',
          center: ['length', 'creation-date', 'bitrate'],
          menuStyle: 'dots-v',
          playingAnim: 'waveform',
          showPlayLink: false,
          showLikeAction: true,
          showAddAction: true,
          shadeFooter: true,
        },
      };

    case 3:
      return {
        ...base,
        coverSide: 'left',
        playPlacement: 'center',
        coverBugs: { like: false, length: true, explicit: false },
        coverBorder: true,
        info: {
          ...base.info,
          showCaption: true,
          showLyricQuote: false,
          showHeaderActions: true,
          genreThemeRender: 'text',
        },
        footer: {
          ...base.footer,
          left: 'explicit',
          center: ['length', 'main-genre', 'creation-date'],
          menuStyle: 'dots-h',
          playingAnim: 'freq-bars',
          showPlayLink: true,
          showAddAction: false,
          showLikeAction: true,
        },
      };

    case 4:
      return {
        ...base,
        coverSide: 'left',
        playPlacement: 'lower-left',
        coverBugs: { like: true, length: false, explicit: false },
        coverBlend: 'light',
        info: {
          ...base.info,
          showCaption: true,
          showThemes: true,
          showHeaderActions: false,
          genreThemeRender: 'pills-round',
        },
        footer: {
          ...base.footer,
          left: 'none',
          center: ['creation-date', 'main-genre'],
          menuStyle: 'dots-h',
          playingAnim: 'none',
          showPlayLink: false,
          showAddAction: true,
          showLikeAction: false,
          showSeparator: false,
        },
      };

    default:
      return base;
  }
}
