import { applyCustomPlaylistOrder } from './playlistOrder.ts';
import { playableQueueSongs } from './playbackQueue.ts';

type CueSong = {
  id: number;
  sort_order: number;
  skipped?: number | boolean | null;
  unavailable?: number | boolean | null;
};

/** Default playlist order for startup cue — custom drag order when present, else catalog sort_order. */
export function orderPlaylistSongsForCue<T extends CueSong>(
  songs: readonly T[],
  customOrderIds?: readonly number[] | null,
): T[] {
  if (customOrderIds?.length) {
    return applyCustomPlaylistOrder([...songs], [...customOrderIds]);
  }
  return [...songs].sort((a, b) => a.sort_order - b.sort_order);
}

export type PickCueSongOptions = {
  preferredSongId?: number | null;
  customOrderIds?: readonly number[] | null;
  sessionSkippedIds?: ReadonlySet<number>;
};

/**
 * Pick a song to show on restart without autoplay.
 * Prefers the saved track when still playable; otherwise the first playable row in playlist order.
 */
export function pickCueSongInPlaylist<T extends CueSong>(
  songs: readonly T[],
  options: PickCueSongOptions = {},
): T | null {
  const ordered = orderPlaylistSongsForCue(songs, options.customOrderIds);
  const playable = playableQueueSongs(ordered, {
    sessionSkippedIds: options.sessionSkippedIds,
  });
  if (!playable.length) return null;

  if (options.preferredSongId != null) {
    const preferred = playable.find((song) => song.id === options.preferredSongId);
    if (preferred) return preferred;
  }

  return playable[0] ?? null;
}
