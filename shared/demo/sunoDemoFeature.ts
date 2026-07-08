/**
 * Demo-only Suno import playlist — sever by setting SUNO_DEMO_FEATURE_ENABLED to false
 * and the matching flag in electron/listener/sunoDemo/feature.js.
 */

/** Master switch — hide UI and reject IPC when false. */
export const SUNO_DEMO_FEATURE_ENABLED = true;

/** Virtual sidebar artist id (distinct from Liked Songs = 0). */
export const SUNO_DEMO_ARTIST_ID = -1;

/** Synthetic song ids: SUNO_DEMO_SONG_ID_BASE - rowId (e.g. -2000001). */
export const SUNO_DEMO_SONG_ID_BASE = -2_000_000;

export const SUNO_DEMO_PLAYBACK_SCOPE = 'suno-demo';

/** Internal manifest URL prefix — resolved in main process, not fetched over HTTP. */
export const SUNO_DEMO_MANIFEST_PREFIX = 'songpages-suno-demo:manifest/';

export function isSunoDemoArtistId(artistId: number | null | undefined): boolean {
  return artistId === SUNO_DEMO_ARTIST_ID;
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

/** Virtual artist row for the Suno Only sidebar playlist. */
export function buildSunoDemoArtistRow(songCount: number) {
  return {
    id: SUNO_DEMO_ARTIST_ID,
    site_url: '',
    site_root_normalized: '',
    artist_slug: 'suno-only',
    artist_name: 'Suno Only',
    artist_photo_url: null,
    artist_bio: null,
    artist_social_json: null,
    build_version: null,
    last_fetched_at: null,
    created_at: '',
    song_count: songCount,
  };
}
