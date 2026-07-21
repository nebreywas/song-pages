/**
 * Song Chips — lightweight song references (not full presentations).
 *
 * Spec: documentation/song-chips-design.md
 * Chips mention a song; Cards present it.
 */

export type SongChipTypeId =
  | 'inline-mention'
  | 'compact'
  | 'row'
  | 'play'
  | 'artwork'
  | 'mention-badge';

/** First-pass themes — skins stay locked; themes recolor the same structure. */
export type SongChipThemeId = 'light' | 'dark';

export type SongChipCoverShape = 'none' | 'square' | 'rounded' | 'circle';

/** Compact chip shows at most one supporting metadata field. */
export type SongChipMetaField =
  | 'none'
  | 'artist'
  | 'length'
  | 'genre'
  | 'date'
  | 'album';

export type SongChipPlayStyle = 'none' | 'filled' | 'outline';

export type SongChipChromeState =
  | 'default'
  | 'hover'
  | 'selected'
  | 'playing'
  | 'disabled'
  | 'loading';

/**
 * Structural choices for a Song Chip.
 * Kept intentionally small — types differ more by family than by toggles.
 */
export type SongChipStructure = {
  typeId: SongChipTypeId;
  themeId: SongChipThemeId;
  coverShape: SongChipCoverShape;
  /** Compact / row supporting field. */
  metaField: SongChipMetaField;
  showArtist: boolean;
  showLength: boolean;
  showPlay: boolean;
  playStyle: SongChipPlayStyle;
  showMenu: boolean;
  showExplicit: boolean;
  showLike: boolean;
  /** Artwork Chip size cue. */
  artworkSize: 'sm' | 'md' | 'lg';
  /** Mention Badge / Inline surface treatment. */
  surface: 'fill' | 'outline' | 'text';
};

/** Flat view-model shared with Song Cards where useful. */
export type SongChipViewModel = {
  title: string;
  artistName: string;
  albumName?: string | null;
  lengthLabel?: string | null;
  creationDate?: string | null;
  primaryGenre?: string | null;
  explicit: boolean;
  coverUrl: string | null;
};
