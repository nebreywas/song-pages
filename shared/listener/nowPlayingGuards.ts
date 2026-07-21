/**
 * Soft guards against purposely removing the song or library row that owns
 * transport right now. Not foolproof (cache/network/DB races still exist) —
 * just blocks the common self-inflicted case.
 */

export const NOW_PLAYING_SONG_REMOVE_TOAST =
  "Can't remove the song that's currently playing.";

export const NOW_PLAYING_PLAYLIST_REMOVE_TOAST =
  "Can't delete the playlist that's currently playing.";

export const NOW_PLAYING_ARTIST_REMOVE_TOAST =
  "Can't remove the artist that's currently playing.";

/** True when this song id is loaded in the transport (playing or paused). */
export function isNowPlayingSong(
  playingSongId: number | null | undefined,
  songId: number,
): boolean {
  return playingSongId != null && playingSongId === songId;
}

/**
 * True when this sidebar artist/playlist id is the source of what's in the
 * transport. Prefer `playingSourcePlaylistId` (set on play) over catalog
 * `artist_id` so custom playlists / Liked Songs match correctly.
 */
export function isNowPlayingLibraryEntry(
  playingSongId: number | null | undefined,
  playingSourcePlaylistId: number | null | undefined,
  libraryArtistId: number,
): boolean {
  if (playingSongId == null) return false;
  return playingSourcePlaylistId === libraryArtistId;
}
