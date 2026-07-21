import {
  applyCustomPlaylistOrder,
  playlistKeyForArtistId,
} from '@shared/listener/playlistOrder';
import {
  mergeSuperShufflePool,
  type SuperShuffleEntry,
} from '@shared/listener/superShuffle';
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

/**
 * Build the Super Shuffle pool from every sidebar playlist id.
 * Order inside each playlist does not matter — we only need eligible song rows.
 */
export async function loadSuperShufflePool(
  playlistIds: readonly number[],
): Promise<SuperShuffleEntry<SongRow>[]> {
  const app = getApp();
  if (!app || !playlistIds.length) return [];

  const lists = await Promise.all(
    playlistIds.map(async (playlistId) => ({
      playlistId,
      songs: await app.listener.listSongs(playlistId),
    })),
  );

  return mergeSuperShufflePool(lists);
}

export function pickNextPrimarySongId(
  orderedSongs: SongRow[],
  anchorSongId: number,
  queueOptions: PlaybackQueueOptions,
  consumedSongIds: readonly number[],
): number | null {
  return pickNextPrimaryFromPlanner(orderedSongs, anchorSongId, queueOptions, consumedSongIds);
}
