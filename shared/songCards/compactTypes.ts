/**
 * Compact Rectangle (landscape) Song Card — structure + skins.
 *
 * Spec: documentation/archive/Compact-rectangle-song-cards.md
 * (also called Landscape Song Cards there).
 */

import type {
  AnimateCoverLoop,
  AnimatedCoverPreference,
  AnimateCoverTrigger,
  CoverBlend,
  ExplicitBugFormat,
  FooterCenterItem,
  FooterLeftContent,
  FooterMenuStyle,
  GenreThemeRender,
  LyricQuoteOverflow,
} from './types';

/** Starter Compact Rectangle skins. */
export type CompactRectangleDesignId = 1 | 2 | 3 | 4;

export type CompactCoverSide = 'left' | 'right';

export type CompactPlayPlacement = 'none' | 'center' | 'lower-left';

/**
 * Compact cards use fewer cover overlays than Portrait.
 * Toggle which bugs appear (placement is design-driven).
 */
export type CompactCoverBugs = {
  like: boolean;
  length: boolean;
  explicit: boolean;
};

export type CompactRectangleStructure = {
  designId: CompactRectangleDesignId;
  coverSide: CompactCoverSide;
  playPlacement: CompactPlayPlacement;
  coverBugs: CompactCoverBugs;

  animatedCover: {
    preference: AnimatedCoverPreference;
    trigger: AnimateCoverTrigger;
    loop: AnimateCoverLoop;
  };

  coverBlend: CoverBlend;
  coverBorder: boolean;

  info: {
    /** Artist • Album line (album from view-model / demo). */
    showAlbum: boolean;
    showSubtitle: boolean;
    showCaption: boolean;
    showLyricQuote: boolean;
    showGenres: boolean;
    showThemes: boolean;
    /** Heart + menu in the info header (screenshot light card). */
    showHeaderActions: boolean;
    lyricQuoteOverflow: LyricQuoteOverflow;
    genreThemeRender: GenreThemeRender;
  };

  footer: {
    left: FooterLeftContent;
    /** Wider footer — designer allows up to 4. */
    center: FooterCenterItem[];
    menuStyle: FooterMenuStyle;
    explicitFormat: ExplicitBugFormat;
    showSeparator: boolean;
    shadeFooter: boolean;
    playingAnim: 'none' | 'freq-bars' | 'waveform' | 'speaker';
    /** Right-side action chrome (like / add) — presentational for now. */
    showLikeAction: boolean;
    showAddAction: boolean;
    showPlayLink: boolean;
  };
};
