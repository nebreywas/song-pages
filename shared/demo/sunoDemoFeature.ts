/**
 * Demo-only Suno import playlist — sever by setting SUNO_DEMO_FEATURE_ENABLED to false
 * and the matching flag in electron/listener/sunoDemo/feature.js.
 */

import { isUserPlaylistSongId } from '../listener/userPlaylists';

/** Master switch — hide UI and reject IPC when false. */
export const SUNO_DEMO_FEATURE_ENABLED = true;

/** First Suno playlist sidebar id (additional playlists use -2, -3, …). */
export const SUNO_DEMO_ARTIST_ID = -1;

/** Synthetic song ids: SUNO_DEMO_SONG_ID_BASE - rowId (e.g. -2000001). */
export const SUNO_DEMO_SONG_ID_BASE = -2_000_000;

export const SUNO_DEMO_PLAYBACK_SCOPE = 'suno-demo';

/** Internal manifest URL prefix — resolved in main process, not fetched over HTTP. */
export const SUNO_DEMO_MANIFEST_PREFIX = 'songpages-suno-demo:manifest/';

export type SunoDemoPlaylistRow = {
  id: number;
  name: string;
  created_at: string;
  song_count: number;
};

export function isSunoDemoArtistId(artistId: number | null | undefined): boolean {
  return typeof artistId === 'number' && artistId < 0 && artistId > -10_001;
}

export function sunoPlaylistArtistId(playlistId: number): number {
  return -playlistId;
}

export function sunoPlaylistIdFromArtistId(artistId: number | null | undefined): number | null {
  if (!isSunoDemoArtistId(artistId)) return null;
  return -artistId!;
}

export function isSunoDemoSongId(songId: number | null | undefined): boolean {
  // Custom playlist entry ids (-3_000_001, …) are more negative than Suno ids and must not match.
  if (isUserPlaylistSongId(songId)) return false;
  return typeof songId === 'number' && songId <= SUNO_DEMO_SONG_ID_BASE;
}

export function isSunoDemoSong(song: {
  id: number;
  playback_scope?: string | null;
  page_url?: string | null;
}): boolean {
  // Snapshot metadata survives custom-playlist virtual ids (-3_000_xxx).
  if (song.playback_scope === SUNO_DEMO_PLAYBACK_SCOPE) return true;
  if (String(song.page_url || '').startsWith('songpages-suno-demo:')) return true;
  if (isUserPlaylistSongId(song.id)) return false;
  return isSunoDemoSongId(song.id);
}

export function sunoDemoManifestUrl(songId: number): string {
  return `${SUNO_DEMO_MANIFEST_PREFIX}${songId}`;
}

const SUNO_PAGE_PREFIX = 'songpages-suno-demo:page/';

const SUNO_CLIP_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeSunoClipUuid(clipUuid: string | null | undefined): string | null {
  const trimmed = String(clipUuid ?? '').trim().toLowerCase();
  return SUNO_CLIP_UUID_RE.test(trimmed) ? trimmed : null;
}

/** Custom-playlist snapshots key by Suno clip UUID — not sidebar sqlite song ids. */
export function sunoDemoPageUrlFromClipUuid(clipUuid: string): string {
  const normalized = normalizeSunoClipUuid(clipUuid);
  if (!normalized) throw new Error('Invalid Suno clip UUID.');
  return `${SUNO_PAGE_PREFIX}${normalized}`;
}

export function sunoDemoManifestUrlFromClipUuid(clipUuid: string): string {
  const normalized = normalizeSunoClipUuid(clipUuid);
  if (!normalized) throw new Error('Invalid Suno clip UUID.');
  return `${SUNO_DEMO_MANIFEST_PREFIX}${normalized}`;
}

/** Parse clip UUID from a Suno custom-playlist page URL. */
export function parseSunoPageClipUuid(pageUrl: string | null | undefined): string | null {
  if (typeof pageUrl !== 'string' || !pageUrl.startsWith(SUNO_PAGE_PREFIX)) return null;
  return normalizeSunoClipUuid(pageUrl.slice(SUNO_PAGE_PREFIX.length));
}

/** Parse clip UUID from a Suno manifest URL (custom-playlist snapshot form). */
export function parseSunoManifestClipUuid(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url.startsWith(SUNO_DEMO_MANIFEST_PREFIX)) return null;
  return normalizeSunoClipUuid(url.slice(SUNO_DEMO_MANIFEST_PREFIX.length));
}

/** Parse the canonical Suno demo song id embedded in a sidebar playlist page URL. */
export function sunoSongIdFromPageUrl(pageUrl: string | null | undefined): number | null {
  if (typeof pageUrl !== 'string' || !pageUrl.startsWith(SUNO_PAGE_PREFIX)) return null;
  const suffix = pageUrl.slice(SUNO_PAGE_PREFIX.length);
  if (normalizeSunoClipUuid(suffix)) return null;
  const id = Number(suffix);
  return isSunoDemoSongId(id) ? id : null;
}

/** Parse a Suno demo manifest URL into the canonical song id, or null when invalid. */
export function parseSunoManifestSongId(url: string | null | undefined): number | null {
  if (typeof url !== 'string' || !url.startsWith(SUNO_DEMO_MANIFEST_PREFIX)) return null;
  const id = Number(url.slice(SUNO_DEMO_MANIFEST_PREFIX.length));
  return isSunoDemoSongId(id) ? id : null;
}

/**
 * Resolve the internal manifest URL for a Suno demo track.
 * Custom-playlist snapshots use clip-UUID URLs; sidebar playlists use numeric song ids.
 */
export function resolveSunoDemoManifestUrl(song: {
  id?: number;
  song_manifest_url?: string | null;
  page_url?: string | null;
  playback_scope?: string | null;
  external_id?: string | null;
}): string | null {
  if (!isSunoDemoSong(song)) return null;

  const fromPageClip = parseSunoPageClipUuid(song.page_url);
  if (fromPageClip) return sunoDemoManifestUrlFromClipUuid(fromPageClip);

  const fromPageSongId = sunoSongIdFromPageUrl(song.page_url);
  if (fromPageSongId != null) return sunoDemoManifestUrl(fromPageSongId);

  const fromManifestClip = parseSunoManifestClipUuid(song.song_manifest_url);
  if (fromManifestClip) return sunoDemoManifestUrlFromClipUuid(fromManifestClip);

  const fromExternal = normalizeSunoClipUuid(song.external_id);
  if (fromExternal) return sunoDemoManifestUrlFromClipUuid(fromExternal);

  if (typeof song.id === 'number' && isSunoDemoSongId(song.id)) {
    return sunoDemoManifestUrl(song.id);
  }

  const storedSongId = parseSunoManifestSongId(song.song_manifest_url);
  if (storedSongId != null) return sunoDemoManifestUrl(storedSongId);

  return null;
}

/** Canonical Suno share URL — https://suno.com/song/{clip-uuid} */
export function sunoShareUrlFromClipUuid(clipUuid: string | null | undefined): string | null {
  const normalized = normalizeSunoClipUuid(clipUuid);
  if (!normalized) return null;
  return `https://suno.com/song/${normalized}`;
}

/** Virtual sidebar row for one Suno playlist. */
export function buildSunoPlaylistArtistRow(playlist: SunoDemoPlaylistRow) {
  return {
    id: sunoPlaylistArtistId(playlist.id),
    site_url: '',
    site_root_normalized: '',
    artist_slug: `suno-${playlist.id}`,
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

/** @deprecated Use buildSunoPlaylistArtistRow — kept for legacy call sites. */
export function buildSunoDemoArtistRow(songCount: number) {
  return buildSunoPlaylistArtistRow({
    id: 1,
    name: 'Suno 1',
    created_at: '',
    song_count: songCount,
  });
}
