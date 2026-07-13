import { isSunoDemoSong } from '../demo/sunoDemoFeature';
import { isUserPlaylistArtistId } from './userPlaylists';

/** How remove/skip behaves for each listener playlist type. */
export type PlaylistKind = 'catalog' | 'personal' | 'custom';

export const LIKED_SONGS_ARTIST_ID = 0;

export function playlistKindForArtistId(artistId: number | null | undefined): PlaylistKind | null {
  if (artistId == null) return null;
  if (artistId === LIKED_SONGS_ARTIST_ID) return 'personal';
  if (isUserPlaylistArtistId(artistId)) return 'custom';
  if (artistId > 0) return 'catalog';
  return null;
}

export function isCatalogPlaylist(artistId: number | null | undefined): boolean {
  return playlistKindForArtistId(artistId) === 'catalog';
}

export function isPersonalPlaylist(artistId: number | null | undefined): boolean {
  return playlistKindForArtistId(artistId) === 'personal';
}

export function isCustomPlaylist(artistId: number | null | undefined): boolean {
  return playlistKindForArtistId(artistId) === 'custom';
}

/** @deprecated Suno sidebar playlists removed — Suno tracks live on user Playlists. */
export function isSunoPlaylist(_artistId: number | null | undefined): boolean {
  return false;
}

/** Liked Songs and user Playlists use virtual sidebar artists — not subscribed Artist Pages. */
export function isVirtualPlaylistArtistId(artistId: number | null | undefined): boolean {
  const kind = playlistKindForArtistId(artistId);
  return kind === 'personal' || kind === 'custom';
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

/** Permanent skip or a VC-session-only skip overlay (not persisted). */
export function isSongSkippedForPlaylist(
  song: { id?: number; skipped?: number | boolean | null },
  sessionSkippedIds?: ReadonlySet<number> | null,
): boolean {
  if (isSongSkipped(song)) return true;
  return song.id != null && sessionSkippedIds?.has(song.id) === true;
}

/** Liked Songs availability probe — NULL = unchecked, 1 = unavailable. */
export function isSongUnavailable(song: { unavailable?: number | boolean | null }): boolean {
  return song.unavailable === 1 || song.unavailable === true;
}

/** Songs eligible for auto-advance, shuffle, and resolvePlayableSong. */
export function isQueueEligibleSong(song: {
  skipped?: number | boolean | null;
  unavailable?: number | boolean | null;
}): boolean {
  return !isSongSkipped(song) && !isSongUnavailable(song);
}
