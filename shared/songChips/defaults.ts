/**
 * Song Chip type catalog + per-type starting structure.
 */

import type { SongChipStructure, SongChipTypeId } from './types';

export const SONG_CHIP_TYPE_IDS: SongChipTypeId[] = [
  'inline-mention',
  'compact',
  'row',
  'play',
  'artwork',
  'mention-badge',
];

export const SONG_CHIP_TYPE_META: Record<
  SongChipTypeId,
  { name: string; blurb: string; number: number }
> = {
  'inline-mention': {
    number: 1,
    name: 'Inline Mention',
    blurb: 'Fits inside a sentence · title + optional play',
  },
  compact: {
    number: 2,
    name: 'Compact Chip',
    blurb: 'Search / autocomplete · cover + title + one meta',
  },
  row: {
    number: 3,
    name: 'Row Chip',
    blurb: 'Lists & queues · play · cover · title · length · menu',
  },
  play: {
    number: 4,
    name: 'Play Chip',
    blurb: 'Audio-first · large play · title · length',
  },
  artwork: {
    number: 5,
    name: 'Artwork Chip',
    blurb: 'Artwork-forward · title (optional artist)',
  },
  'mention-badge': {
    number: 6,
    name: 'Mention Badge',
    blurb: 'Densest reference · note icon + title',
  },
};

export function defaultSongChipStructure(): SongChipStructure {
  return structureForChipType('compact');
}

/** Sensible starting structure for each chip family. */
export function structureForChipType(typeId: SongChipTypeId): SongChipStructure {
  const base: SongChipStructure = {
    typeId,
    themeId: 'light',
    coverShape: 'rounded',
    metaField: 'artist',
    showArtist: true,
    showLength: false,
    showPlay: true,
    playStyle: 'filled',
    showMenu: false,
    showExplicit: false,
    showLike: false,
    artworkSize: 'md',
    surface: 'fill',
  };

  switch (typeId) {
    case 'inline-mention':
      return {
        ...base,
        coverShape: 'none',
        metaField: 'none',
        showArtist: false,
        showLength: false,
        showPlay: true,
        playStyle: 'filled',
        surface: 'fill',
      };
    case 'compact':
      return {
        ...base,
        coverShape: 'rounded',
        metaField: 'artist',
        showPlay: true,
        playStyle: 'filled',
      };
    case 'row':
      return {
        ...base,
        coverShape: 'rounded',
        metaField: 'none',
        showArtist: true,
        showLength: true,
        showPlay: true,
        playStyle: 'filled',
        showMenu: true,
        showExplicit: false,
        showLike: false,
      };
    case 'play':
      return {
        ...base,
        coverShape: 'none',
        metaField: 'none',
        showArtist: false,
        showLength: true,
        showPlay: true,
        playStyle: 'filled',
      };
    case 'artwork':
      return {
        ...base,
        coverShape: 'rounded',
        metaField: 'none',
        showArtist: true,
        showLength: false,
        showPlay: false,
        artworkSize: 'md',
      };
    case 'mention-badge':
      return {
        ...base,
        coverShape: 'none',
        metaField: 'none',
        showArtist: false,
        showLength: false,
        showPlay: false,
        surface: 'fill',
      };
    default:
      return base;
  }
}
