import { resolvePlaylistSongSource } from '@shared/listener/playlistSongSource';
import type { SongRow } from '../types/app';

export type SortColumn =
  | 'order'
  | 'custom'
  | 'title'
  | 'artist'
  | 'album'
  | 'year'
  | 'plays'
  | 'source'
  | 'length';
export type SortDirection = 'asc' | 'desc';

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

function songLengthSeconds(song: SongRow, runtimeDurations: Record<number, number>): number {
  const seconds = song.duration_seconds ?? runtimeDurations[song.id];
  return seconds != null && seconds > 0 ? seconds : -1;
}

/** Sort a copy of the playlist for display — catalog order is preserved in the source array. */
export function sortPlaylistSongs(
  songs: SongRow[],
  column: SortColumn,
  direction: SortDirection,
  runtimeDurations: Record<number, number>,
  /** songId → play count when sorting the Plays column. */
  playCounts: ReadonlyMap<number, number> = new Map(),
): SongRow[] {
  const mult = direction === 'asc' ? 1 : -1;
  const sorted = [...songs];

  sorted.sort((a, b) => {
    let result = 0;

    switch (column) {
      case 'order':
      case 'custom':
        result = a.sort_order - b.sort_order;
        break;
      case 'title':
        result = compareText(a.title, b.title);
        break;
      case 'artist':
        result = compareText(a.artist_name || '', b.artist_name || '');
        break;
      case 'album':
        result = compareText(a.album || '', b.album || '');
        break;
      case 'year':
        result = compareText(a.year || '', b.year || '');
        break;
      case 'plays': {
        const aPlays = playCounts.get(a.id) ?? 0;
        const bPlays = playCounts.get(b.id) ?? 0;
        result = aPlays - bPlays;
        break;
      }
      case 'source':
        result = compareText(
          resolvePlaylistSongSource(a).label,
          resolvePlaylistSongSource(b).label,
        );
        break;
      case 'length': {
        const aLen = songLengthSeconds(a, runtimeDurations);
        const bLen = songLengthSeconds(b, runtimeDurations);
        // Unknown lengths sort last in ascending order.
        if (aLen < 0 && bLen < 0) result = 0;
        else if (aLen < 0) result = 1;
        else if (bLen < 0) result = -1;
        else result = aLen - bLen;
        break;
      }
      default:
        result = 0;
    }

    if (result === 0 && column !== 'title') {
      result = compareText(a.title, b.title);
    }

    return result * mult;
  });

  return sorted;
}
