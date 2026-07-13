import { playlistKindForArtistId, type PlaylistKind } from '@shared/listener/playlistKinds';
import { userPlaylistEntryIdFromSongId } from '@shared/listener/userPlaylists';

import { getApp } from '../lib/bridge';
import type { SongRow } from '../types/app';

/** Persist skip / restore for any playlist kind. */
export async function persistPlaylistSongSkipped(
  song: SongRow,
  kind: PlaylistKind,
  skipped: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const app = getApp();
  if (!app?.listener) {
    return { ok: false, error: 'App bridge unavailable.' };
  }

  if (kind === 'catalog') {
    if (!app.listener.setCatalogSongSkipped) {
      return { ok: false, error: 'Catalog skip is unavailable.' };
    }
    return app.listener.setCatalogSongSkipped(song.artist_id, song.external_id, skipped);
  }

  if (kind === 'custom') {
    if (!app.listener.setUserPlaylistSongSkipped) {
      return { ok: false, error: 'Restart the app to skip songs on custom playlists.' };
    }
    const entryId = song.user_playlist_entry_id ?? userPlaylistEntryIdFromSongId(song.id);
    return app.listener.setUserPlaylistSongSkipped(entryId, skipped);
  }

  if (kind === 'personal') {
    if (!app.listener.setLikedSongSkipped) {
      return { ok: false, error: 'Restart the app to skip liked songs.' };
    }
    return app.listener.setLikedSongSkipped({
      songId: song.id,
      likedId: song.liked_id ?? null,
      skipped,
    });
  }

  return { ok: false, error: 'Unsupported playlist type.' };
}

export function playlistKindForSong(song: SongRow, selectedArtistId: number | null): PlaylistKind | null {
  return playlistKindForArtistId(selectedArtistId ?? song.artist_id);
}
