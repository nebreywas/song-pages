import type { SongRow } from '../types/app';
import { getApp } from '../lib/bridge';

export type ResolvedSongAccess = {
  pageUrl: string;
  playbackUrl: string;
  fromCache: boolean;
};

/** Resolve network or cached URLs through the main-process cache manager. */
export async function resolveSongAccess(
  song: SongRow,
  source?: 'show_song_page' | 'play_song',
): Promise<ResolvedSongAccess> {
  const app = getApp();
  if (!app?.listener.resolveSongAccess) {
    return { pageUrl: song.page_url, playbackUrl: song.playback_url, fromCache: false };
  }

  const result = await app.listener.resolveSongAccess(
    {
      id: song.id,
      library_song_id: song.library_song_id ?? null,
      page_url: song.page_url,
      playback_url: song.playback_url,
    },
    source,
  );
  if (!result.ok || !result.data) {
    return { pageUrl: song.page_url, playbackUrl: song.playback_url, fromCache: false };
  }

  return result.data;
}
