/**
 * Song Portrait Card — structural choices + design template ids.
 *
 * These types feed the Song Cards designer and the reusable SongPortraitCard
 * renderer. Choices here are the “what goes where” language of Song Pages;
 * visual polish lives on each Card Design template.
 */

/** Starter design skins we iterate in the designer before locking. */
export type SongCardDesignId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** One corner of the Cover Zone — at most one bug, or empty. */
export type CoverCornerBug =
  | 'none'
  | 'explicit'
  | 'play'
  | 'like'
  | 'length';

export type CoverCornerSlot = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

/** How animated covers interact with static artwork on this card. */
export type AnimatedCoverPreference =
  | 'prefer-animated'
  | 'never'
  | 'when-playing';

export type AnimateCoverTrigger = 'on-click' | 'on-play' | 'when-in-view';

export type AnimateCoverLoop = 'once' | 'loop';

/** Bugs sit on the artwork vs. just outside the cover frame. */
export type CoverBugsPlacement = 'overlay' | 'outside';

export type LikeBugStyle = 'heart' | 'plus-circle' | 'text-pill';

export type PlayBugSize = 'normal' | 'outside';

export type PlayBugFill = 'filled' | 'outline';

export type CoverBlend = 'none' | 'light' | 'middle' | 'dark';

export type LyricQuoteOverflow = 'clamp' | 'fade' | 'scroll';

export type FooterLeftContent = 'none' | 'track-number' | 'explicit';

/** Center footer can show up to two of these. */
export type FooterCenterItem =
  | 'length'
  | 'creation-date'
  | 'bitrate'
  | 'main-genre';

export type FooterMenuStyle = 'dots-h' | 'dots-v' | 'info' | 'hamburger' | 'flip';

export type ExplicitBugFormat = 'E' | 'Explicit';

export type GenreThemeRender = 'text' | 'pills-rect' | 'pills-round';

/**
 * Full structural config for a portrait Song Card.
 * Independent of which Card Design (1–6) skins it.
 */
export type SongCardStructure = {
  designId: SongCardDesignId;

  /** Fraction of card height given to Cover Zone (0.35–0.72). Info fills the rest after footer. */
  coverHeightRatio: number;

  animatedCover: {
    preference: AnimatedCoverPreference;
    trigger: AnimateCoverTrigger;
    loop: AnimateCoverLoop;
  };

  corners: Record<CoverCornerSlot, CoverCornerBug>;
  coverBugsPlacement: CoverBugsPlacement;
  likeStyle: LikeBugStyle;
  playSize: PlayBugSize;
  playFill: PlayBugFill;
  coverBlend: CoverBlend;
  coverBorder: boolean;

  info: {
    showCaption: boolean;
    showSubtitle: boolean;
    showGenres: boolean;
    showThemes: boolean;
    showLyricQuote: boolean;
    lyricQuoteOverflow: LyricQuoteOverflow;
    genreThemeRender: GenreThemeRender;
  };

  footer: {
    left: FooterLeftContent;
    /** Exactly zero, one, or two items — designer enforces max 2. */
    center: FooterCenterItem[];
    menuStyle: FooterMenuStyle;
    explicitFormat: ExplicitBugFormat;
    showSeparator: boolean;
    shadeFooter: boolean;
    playingAnim: 'none' | 'freq-bars' | 'waveform' | 'speaker';
  };
};

/** Card chrome state for preview / future host surfaces. */
export type SongCardChromeState =
  | 'default'
  | 'hover'
  | 'playing'
  | 'selected'
  | 'disabled'
  | 'loading';

/**
 * Flat view-model the renderer needs — resolved from Song + Artist + context.
 * Keeps the React card free of catalog/payload shape details.
 */
export type SongCardViewModel = {
  title: string;
  artistName: string;
  subtitle?: string;
  caption?: string;
  lyricQuote?: string;
  genres: string[];
  themes: string[];
  explicit: boolean;
  /** Cover image URL (file:// or http), or null for placeholder. */
  coverUrl: string | null;
  /** Future: animated cover URL when preference allows. */
  animatedCoverUrl?: string | null;
  /** Display length e.g. "3:42"; null when unknown. */
  lengthLabel?: string | null;
  creationDate?: string | null;
  bitrateLabel?: string | null;
  trackNumber?: string | null;
  /**
   * Album / collection label for Compact Rectangle “Artist • Album” lines.
   * Optional — song editor may not resolve membership yet.
   */
  albumName?: string | null;
};
