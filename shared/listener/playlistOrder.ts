import { userPlaylistIdFromArtistId } from './userPlaylists.ts';

/** Minimal song shape for custom-order sorting. */
export type PlaylistOrderSong = {
  id: number;
  sort_order: number;
};

export const LIKED_PLAYLIST_KEY = 'liked';
export const SUNO_PLAYLIST_KEY = 'suno';

export function playlistKeyForArtistId(artistId: number): string {
  if (artistId === 0) return LIKED_PLAYLIST_KEY;
  const userPlaylistId = userPlaylistIdFromArtistId(artistId);
  if (userPlaylistId != null) return `user:${userPlaylistId}`;
  if (artistId < 0) return `suno:${-artistId}`;
  return `artist:${artistId}`;
}

/** Drop removed songs, keep relative order, append new songs at the end. */
export function syncCustomPlaylistOrder(storedOrder: number[], currentSongIds: number[]): number[] {
  if (storedOrder.length === 0) return [...currentSongIds];

  const currentSet = new Set(currentSongIds);
  const filtered = storedOrder.filter((id) => currentSet.has(id));
  const placed = new Set(filtered);
  const appended = currentSongIds.filter((id) => !placed.has(id));
  return [...filtered, ...appended];
}

/**
 * When a playlist already has custom order, newly added/moved tracks append at the bottom.
 * Returns null when no custom order exists yet (caller should not create one).
 */
export function appendToCustomOrderIfExists(
  storedOrder: number[],
  songId: number,
): number[] | null {
  if (storedOrder.length === 0) return null;
  if (storedOrder.includes(songId)) return storedOrder;
  return [...storedOrder, songId];
}

/** Remove one song id from a saved custom order; returns null when order becomes empty. */
export function removeFromCustomOrder(storedOrder: number[], songId: number): number[] | null {
  if (storedOrder.length === 0) return null;
  const next = storedOrder.filter((id) => id !== songId);
  if (next.length === storedOrder.length) return storedOrder;
  return next.length === 0 ? null : next;
}

/** Reorder a list by moving one index to another (same splice semantics as kudo presets). */
export function reorderPlaylistIds<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return [...items];
  const next = [...items];
  const [row] = next.splice(fromIndex, 1);
  if (row === undefined) return next;
  next.splice(toIndex, 0, row);
  return next;
}

const orderPosition = new Map<number, number>();

/** Stable 1-based catalog positions from sort_order (independent of active table sort). */
export function buildCatalogOrderMap<T extends PlaylistOrderSong>(songs: T[]): Map<number, number> {
  const catalogSorted = [...songs].sort((a, b) => {
    const byOrder = a.sort_order - b.sort_order;
    return byOrder !== 0 ? byOrder : a.id - b.id;
  });
  const map = new Map<number, number>();
  catalogSorted.forEach((song, index) => map.set(song.id, index + 1));
  return map;
}

/** 1-based positions for a saved personal order list. */
export function buildCustomOrderMap(orderedSongIds: number[]): Map<number, number> {
  const map = new Map<number, number>();
  orderedSongIds.forEach((id, index) => map.set(id, index + 1));
  return map;
}

/** Sort songs by a saved custom id list — unknown ids sort after known ones. */
export function applyCustomPlaylistOrder<T extends PlaylistOrderSong>(
  songs: T[],
  orderedSongIds: number[],
): T[] {
  orderPosition.clear();
  orderedSongIds.forEach((id, index) => orderPosition.set(id, index));

  return [...songs].sort((a, b) => {
    const aPos = orderPosition.get(a.id);
    const bPos = orderPosition.get(b.id);
    if (aPos != null && bPos != null) return aPos - bPos;
    if (aPos != null) return -1;
    if (bPos != null) return 1;
    return a.sort_order - b.sort_order;
  });
}
