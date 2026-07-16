import {
  applyCustomPlaylistOrder,
  playlistKeyForArtistId,
} from '@shared/listener/playlistOrder';
import {
  pickNextPrimarySongId as pickNextPrimaryFromPlanner,
  type PlaybackQueueOptions,
} from '@shared/playback/queue/planner';
import type { SongRow } from '../types/app';
import { getApp } from '../lib/bridge';
import { sortPlaylistSongs } from './sortPlaylist';

/** Load a playlist and return rows in the user's saved / catalog order. */
export async function loadOrderedPlaylistSongs(artistId: number): Promise<SongRow[]> {
  const app = getApp();
  if (!app) return [];

  const songRows = await app.listener.listSongs(artistId);
  if (!songRows.length) return [];

  const playlistKey = playlistKeyForArtistId(artistId);
  const orderState = app.listener.getPlaylistOrderState
    ? await app.listener.getPlaylistOrderState(
        playlistKey,
        songRows.map((song) => song.id),
      )
    : null;

  if (orderState?.ok && orderState.data?.hasCustomOrder) {
    return applyCustomPlaylistOrder(songRows, orderState.data.songIds);
  }

  return sortPlaylistSongs(songRows, 'order', 'asc', {});
}

export function pickNextPrimarySongId(
  orderedSongs: SongRow[],
  anchorSongId: number,
  queueOptions: PlaybackQueueOptions,
  consumedSongIds: readonly number[],
): number | null {
  return pickNextPrimaryFromPlanner(orderedSongs, anchorSongId, queueOptions, consumedSongIds);
}
