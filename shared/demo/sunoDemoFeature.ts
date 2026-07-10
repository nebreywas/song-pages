/**
 * Demo-only Suno import playlist — sever by setting SUNO_DEMO_FEATURE_ENABLED to false
 * and the matching flag in electron/listener/sunoDemo/feature.js.
 */

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
  return typeof songId === 'number' && songId <= SUNO_DEMO_SONG_ID_BASE;
}

export function isSunoDemoSong(song: { id: number; playback_scope?: string | null }): boolean {
  return isSunoDemoSongId(song.id) || song.playback_scope === SUNO_DEMO_PLAYBACK_SCOPE;
}

export function sunoDemoManifestUrl(songId: number): string {
  return `${SUNO_DEMO_MANIFEST_PREFIX}${songId}`;
}

const SUNO_CLIP_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Canonical Suno share URL — https://suno.com/song/{clip-uuid} */
export function sunoShareUrlFromClipUuid(clipUuid: string | null | undefined): string | null {
  const trimmed = String(clipUuid ?? '').trim();
  if (!SUNO_CLIP_UUID_RE.test(trimmed)) return null;
  return `https://suno.com/song/${trimmed.toLowerCase()}`;
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
