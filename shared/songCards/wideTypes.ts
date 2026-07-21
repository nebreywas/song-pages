/**
 * Wide Song Cards — collection/list layouts (albums, playlists, queues).
 *
 * Spec: documentation/archive/Wide-song-cards-design.md
 * Zones: Cover · Information · Track Highlights · Tail
 */

import type {
  AnimateCoverLoop,
  AnimatedCoverPreference,
  AnimateCoverTrigger,
  CoverBlend,
  ExplicitBugFormat,
  FooterCenterItem,
  FooterMenuStyle,
  GenreThemeRender,
  LyricQuoteOverflow,
} from './types';

export type WideSongCardDesignId = 1 | 2 | 3 | 4 | 5 | 6;

export type WideCoverSize = 'sm' | 'md' | 'lg';

export type WidePlayPlacement =
  | 'none'
  | 'center'
  | 'lower-right'
  /** Large play control in the Tail Zone (Lyrics Preview reference). */
  | 'tail';

/**
 * Single featured element in the Track Highlights Zone.
 * Only one is shown at a time.
 */
export type WideHighlightFeature =
  | 'none'
  | 'waveform'
  | 'lyric-quote'
  | 'metadata-grid'
  | 'engagement'
  | 'meta-inline';

export type WideSongCardStructure = {
  designId: WideSongCardDesignId;
  coverSize: WideCoverSize;
  playPlacement: WidePlayPlacement;
  showTrackNumber: boolean;

  animatedCover: {
    preference: AnimatedCoverPreference;
    trigger: AnimateCoverTrigger;
    loop: AnimateCoverLoop;
  };

  coverBlend: CoverBlend;
  coverBorder: boolean;

  info: {
    showAlbum: boolean;
    showSubtitle: boolean;
    showCaption: boolean;
    showGenres: boolean;
    showThemes: boolean;
    showExplicitBug: boolean;
    /** Inline lyric in the info column (Minimal Elegant one-liner). */
    showLyricQuote: boolean;
    lyricQuoteOverflow: LyricQuoteOverflow;
    genreThemeRender: GenreThemeRender;
  };

  highlights: {
    feature: WideHighlightFeature;
    /** Structured metadata under / beside the feature (up to 3). */
    metadata: FooterCenterItem[];
  };

  tail: {
    showDate: boolean;
    showLength: boolean;
    showBitrate: boolean;
    showLike: boolean;
    showAdd: boolean;
    showPlayNext: boolean;
    showAddToPlaylist: boolean;
    menuStyle: FooterMenuStyle;
    explicitFormat: ExplicitBugFormat;
  };
};
