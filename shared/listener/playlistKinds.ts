import { isSunoDemoSong, SUNO_DEMO_ARTIST_ID } from '../demo/sunoDemoFeature';

/** How remove/skip behaves for each listener playlist type. */
export type PlaylistKind = 'catalog' | 'personal' | 'suno';

export const LIKED_SONGS_ARTIST_ID = 0;

export function playlistKindForArtistId(artistId: number | null | undefined): PlaylistKind | null {
  if (artistId == null) return null;
  if (artistId === LIKED_SONGS_ARTIST_ID) return 'personal';
  if (artistId === SUNO_DEMO_ARTIST_ID) return 'suno';
  if (artistId > 0) return 'catalog';
  return null;
}

export function isCatalogPlaylist(artistId: number | null | undefined): boolean {
  return playlistKindForArtistId(artistId) === 'catalog';
}

export function isPersonalPlaylist(artistId: number | null | undefined): boolean {
  return playlistKindForArtistId(artistId) === 'personal';
}

export function isSunoPlaylist(artistId: number | null | undefined): boolean {
  return playlistKindForArtistId(artistId) === 'suno';
}

/** Liked Songs and Suno Only use virtual sidebar artists — not real artist profiles. */
export function isVirtualPlaylistArtistId(artistId: number | null | undefined): boolean {
  const kind = playlistKindForArtistId(artistId);
  return kind === 'personal' || kind === 'suno';
}

type VcArtistNameSource = {
  artist_id: number;
  artist_name?: string | null;
  playback_scope?: string | null;
  id: number;
};

/** True for Liked Songs, Suno Only, and other virtual sidebar playlists. */
export function isVirtualPlaylistSong(song: VcArtistNameSource | null | undefined): boolean {
  if (!song) return false;
  return isVirtualPlaylistArtistId(song.artist_id) || isSunoDemoSong(song);
}

/** VC artist-name cells should use per-track metadata on virtual playlists, not "Liked Songs" / "Suno Only". */
export function vcArtistDisplayName(
  song: VcArtistNameSource | null | undefined,
  artistProfile: { id?: number; artist_name?: string | null } | null | undefined,
  manifestArtistName?: string | null,
): string | null {
  if (artistProfile && isVirtualPlaylistArtistId(artistProfile.id)) {
    artistProfile = null;
  }

  if (!song) {
    return artistProfile?.artist_name?.trim() || null;
  }

  if (isVirtualPlaylistSong(song)) {
    return song.artist_name?.trim() || manifestArtistName?.trim() || null;
  }

  return artistProfile?.artist_name?.trim() || song.artist_name?.trim() || manifestArtistName?.trim() || null;
}

/** User-marked skip on subscribed catalog rows — song stays in the list. */
export function isSongSkipped(song: { skipped?: number | boolean | null }): boolean {
  return song.skipped === 1 || song.skipped === true;
}
