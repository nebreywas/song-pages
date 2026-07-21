/**
 * Build a SongChipViewModel from Song Editor context.
 */

import { songCreationDate, type Artist2SongPayload } from '@shared/artist2';
import type { SongChipViewModel } from '@shared/songChips';
import { formatCardCreationDate } from '../song-cards/buildSongCardViewModel';

export function buildSongChipViewModel(args: {
  title: string;
  artistName: string;
  payload: Artist2SongPayload;
  coverUrl: string | null;
  lengthLabel?: string | null;
  albumName?: string | null;
}): SongChipViewModel {
  const { payload } = args;
  return {
    title: args.title.trim() || 'Untitled',
    artistName: args.artistName.trim() || 'Artist',
    albumName: args.albumName ?? null,
    lengthLabel: args.lengthLabel ?? null,
    creationDate: formatCardCreationDate(songCreationDate(payload)),
    primaryGenre: payload.primaryGenre?.trim() || null,
    explicit: payload.explicit === true,
    coverUrl: args.coverUrl,
  };
}
