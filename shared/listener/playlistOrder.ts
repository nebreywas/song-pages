/** Minimal song shape for custom-order sorting. */
export type PlaylistOrderSong = {
  id: number;
  sort_order: number;
};

export const LIKED_PLAYLIST_KEY = 'liked';
export const SUNO_PLAYLIST_KEY = 'suno';

export function playlistKeyForArtistId(artistId: number): string {
  if (artistId === 0) return LIKED_PLAYLIST_KEY;
  if (artistId === -1) return SUNO_PLAYLIST_KEY;
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
