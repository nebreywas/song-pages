/**
 * Song Card primitives — Portrait · Compact Rectangle · Wide.
 * Each primitive has its own structure + design skin catalog.
 */

export type SongCardPrimitiveId =
  | 'portrait'
  | 'compact-rectangle'
  | 'wide';

export const SONG_CARD_PRIMITIVE_IDS: SongCardPrimitiveId[] = [
  'portrait',
  'compact-rectangle',
  'wide',
];

export const SONG_CARD_PRIMITIVE_META: Record<
  SongCardPrimitiveId,
  { name: string; blurb: string }
> = {
  portrait: {
    name: 'Portrait',
    blurb: 'Vertical 230×300 · object-focused · cover over text',
  },
  'compact-rectangle': {
    name: 'Compact Rectangle',
    blurb: 'Horizontal editorial · cover left/right · full-width footer',
  },
  wide: {
    name: 'Wide',
    blurb: 'Full-width stack rows · albums / playlists / queues',
  },
};
