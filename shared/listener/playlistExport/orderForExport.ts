import { isSongSkipped } from '../playlistKinds';
import { applyCustomPlaylistOrder } from '../playlistOrder';

/**
 * Canonical playlist order for share export — not the active table column sort.
 * Custom playlists use saved drag order when present; otherwise catalog sort_order.
 */
export function orderSongsForPlaylistExport<T extends { id: number; sort_order: number; skipped?: number | boolean | null }>(
  songs: T[],
  customOrderIds: number[] | null | undefined,
): T[] {
  const included = songs.filter((song) => !isSongSkipped(song));
  if (customOrderIds?.length) {
    return applyCustomPlaylistOrder(included, customOrderIds);
  }
  return [...included].sort((a, b) => {
    const byOrder = a.sort_order - b.sort_order;
    return byOrder !== 0 ? byOrder : a.id - b.id;
  });
}
