/**
 * Custom user playlists — virtual sidebar ids at -10001 and below.
 */

/** Sidebar artist id for user playlist row N is USER_PLAYLIST_ARTIST_ID_BASE - N. */
export const USER_PLAYLIST_ARTIST_ID_BASE = -10_000;

/** Synthetic song row ids for custom playlist entries. */
export const USER_PLAYLIST_SONG_ID_BASE = -3_000_000;

export type UserPlaylistRow = {
  id: number;
  name: string;
  created_at: string;
  song_count: number;
};

export function isUserPlaylistArtistId(artistId: number | null | undefined): boolean {
  return typeof artistId === 'number' && artistId <= USER_PLAYLIST_ARTIST_ID_BASE - 1;
}

export function userPlaylistArtistId(playlistId: number): number {
  return USER_PLAYLIST_ARTIST_ID_BASE - playlistId;
}

export function userPlaylistIdFromArtistId(artistId: number | null | undefined): number | null {
  if (!isUserPlaylistArtistId(artistId)) return null;
  return USER_PLAYLIST_ARTIST_ID_BASE - artistId!;
}

export function isUserPlaylistSongId(songId: number | null | undefined): boolean {
  return typeof songId === 'number' && songId <= USER_PLAYLIST_SONG_ID_BASE;
}

export function userPlaylistEntryIdFromSongId(songId: number): number {
  return USER_PLAYLIST_SONG_ID_BASE - songId;
}

export function userPlaylistSongIdFromEntryId(entryId: number): number {
  return USER_PLAYLIST_SONG_ID_BASE - entryId;
}

/** Virtual sidebar row for one custom user playlist. */
export function buildUserPlaylistArtistRow(playlist: UserPlaylistRow) {
  return {
    id: userPlaylistArtistId(playlist.id),
    site_url: '',
    site_root_normalized: '',
    artist_slug: `custom-${playlist.id}`,
    artist_name: playlist.name,
    artist_photo_url: null,
    artist_bio: null,
    artist_social_json: null,
    build_version: null,
    last_fetched_at: null,
    created_at: playlist.created_at,
    song_count: playlist.song_count,
  };
}

/** Playlists shown in the add/move song modal (custom only). */
export type PlaylistPickerRow = {
  id: number;
  artist_id: number;
  name: string;
  song_count: number;
  kind: 'custom';
};

export function toPlaylistPickerRow(playlist: UserPlaylistRow): PlaylistPickerRow {
  return {
    id: playlist.id,
    artist_id: userPlaylistArtistId(playlist.id),
    name: playlist.name,
    song_count: playlist.song_count,
    kind: 'custom',
  };
}
