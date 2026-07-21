/**
 * Wide Song Card defaults + per-skin starting structure.
 * Skins track the Wide reference sheet (Classic → Minimal Elegant).
 */

import type { WideSongCardDesignId, WideSongCardStructure } from './wideTypes';

export const WIDE_SONG_CARD_DESIGN_IDS: WideSongCardDesignId[] = [
  1, 2, 3, 4, 5, 6,
];

export const WIDE_SONG_CARD_DESIGN_META: Record<
  WideSongCardDesignId,
  { name: string; blurb: string }
> = {
  1: {
    name: 'Classic Info Row',
    blurb: 'Clean info-forward · waveform highlight · action links',
  },
  2: {
    name: 'Compact Tags',
    blurb: 'Subtitle + tags · inline meta chips · lavender field',
  },
  3: {
    name: 'Artwork Emphasis',
    blurb: 'Larger cover · dark immersive · metadata grid',
  },
  4: {
    name: 'Lyrics Preview',
    blurb: 'Quoted lyric block · large tail play',
  },
  5: {
    name: 'Progressive List',
    blurb: 'Engagement columns · discovery / stats context',
  },
  6: {
    name: 'Minimal Elegant',
    blurb: 'Small cover · typographic · one-line quote',
  },
};

export function defaultWideSongCardStructure(): WideSongCardStructure {
  return {
    designId: 1,
    coverSize: 'md',
    playPlacement: 'center',
    showTrackNumber: true,
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
      showGenres: true,
      showThemes: false,
      showExplicitBug: true,
      showLyricQuote: false,
      lyricQuoteOverflow: 'clamp',
      genreThemeRender: 'pills-round',
    },
    highlights: {
      feature: 'waveform',
      metadata: ['creation-date', 'length'],
    },
    tail: {
      showDate: true,
      showLength: true,
      showBitrate: false,
      showLike: true,
      showAdd: true,
      showPlayNext: true,
      showAddToPlaylist: true,
      menuStyle: 'dots-h',
      explicitFormat: 'Explicit',
    },
  };
}

export function structureForWideDesign(
  designId: WideSongCardDesignId,
): WideSongCardStructure {
  const base = defaultWideSongCardStructure();
  base.designId = designId;

  switch (designId) {
    case 1:
      return base;

    case 2:
      return {
        ...base,
        coverSize: 'md',
        playPlacement: 'center',
        info: {
          ...base.info,
          showCaption: false,
          showSubtitle: true,
          showExplicitBug: false,
          genreThemeRender: 'pills-round',
        },
        highlights: {
          feature: 'meta-inline',
          metadata: ['length', 'creation-date', 'bitrate'],
        },
        tail: {
          ...base.tail,
          showDate: false,
          showLength: false,
          showPlayNext: false,
          showAddToPlaylist: false,
        },
      };

    case 3:
      return {
        ...base,
        coverSize: 'lg',
        playPlacement: 'center',
        coverBlend: 'middle',
        info: {
          ...base.info,
          showCaption: true,
          showExplicitBug: false,
        },
        highlights: {
          feature: 'metadata-grid',
          metadata: ['length', 'creation-date', 'main-genre'],
        },
        tail: {
          ...base.tail,
          showDate: false,
          showLength: false,
          showPlayNext: false,
          showAddToPlaylist: false,
        },
      };

    case 4:
      return {
        ...base,
        coverSize: 'md',
        playPlacement: 'tail',
        info: {
          ...base.info,
          showCaption: false,
          showLyricQuote: false,
          showExplicitBug: false,
        },
        highlights: {
          feature: 'lyric-quote',
          metadata: ['length', 'creation-date'],
        },
        tail: {
          ...base.tail,
          showDate: true,
          showLength: true,
          showPlayNext: false,
          showAddToPlaylist: false,
          explicitFormat: 'E',
        },
      };

    case 5:
      return {
        ...base,
        coverSize: 'md',
        playPlacement: 'center',
        info: {
          ...base.info,
          showCaption: true,
          showExplicitBug: false,
        },
        highlights: {
          feature: 'engagement',
          metadata: [],
        },
        tail: {
          ...base.tail,
          showDate: true,
          showLength: true,
          showBitrate: true,
          showPlayNext: false,
          showAddToPlaylist: false,
        },
      };

    case 6:
      return {
        ...base,
        coverSize: 'sm',
        playPlacement: 'lower-right',
        info: {
          ...base.info,
          showCaption: false,
          showGenres: false,
          showLyricQuote: true,
          showExplicitBug: false,
          lyricQuoteOverflow: 'clamp',
        },
        highlights: {
          feature: 'none',
          metadata: [],
        },
        tail: {
          ...base.tail,
          showDate: true,
          showLength: true,
          showBitrate: false,
          showPlayNext: false,
          showAddToPlaylist: false,
        },
      };

    default:
      return base;
  }
}
