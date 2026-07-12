/**
 * Match playlist snapshots to subscribed catalog songs by canonical page URL.
 */
const { getDatabase } = require('../database');

const USER_PLAYLIST_ARTIST_ID_BASE = -10_000;
const USER_PLAYLIST_SONG_ID_BASE = -3_000_000;

function isUserPlaylistArtistId(artistId) {
  return typeof artistId === 'number' && artistId <= USER_PLAYLIST_ARTIST_ID_BASE - 1;
}

function isUserPlaylistSongId(songId) {
  return typeof songId === 'number' && songId <= USER_PLAYLIST_SONG_ID_BASE;
}

function pageUrlResourceIdentity(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url));
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return null;
  }
}

function findLibrarySongIdByPageUrl(pageUrl) {
  const trimmed = String(pageUrl || '').trim();
  if (!trimmed) return null;

  const db = getDatabase();
  const exact = db.prepare('SELECT id FROM songs WHERE page_url = ?').get(trimmed);
  if (exact) return exact.id;

  const identity = pageUrlResourceIdentity(pageUrl);
  if (!identity) return null;

  const rows = db.prepare('SELECT id, page_url FROM songs').all();
  for (const row of rows) {
    if (pageUrlResourceIdentity(row.page_url) === identity) return row.id;
  }
  return null;
}

/** Null convenience links on playlist snapshots when the catalog row no longer exists. */
function clearStalePlaylistLibrarySongId(librarySongId) {
  if (typeof librarySongId !== 'number' || librarySongId <= 0) return false;
  const library = require('./library');
  if (library.getSongById(librarySongId)) return false;

  getDatabase()
    .prepare('UPDATE user_playlist_songs SET library_song_id = NULL WHERE library_song_id = ?')
    .run(librarySongId);
  return true;
}

function snapshotAccessUrls(songRef) {
  const pageUrl = String(songRef?.page_url || '').trim();
  const playbackUrl = String(songRef?.playback_url || '').trim();
  if (!pageUrl || !playbackUrl) return null;
  return { pageUrl, playbackUrl, fromCache: false };
}

/** Catalog artist id for snapshots — never use virtual playlist sidebar ids. */
function resolveCatalogSourceArtistId(song) {
  if (typeof song.source_artist_id === 'number' && song.source_artist_id > 0) {
    return song.source_artist_id;
  }
  const artistId = song.artist_id;
  if (typeof artistId === 'number' && artistId > 0 && !isUserPlaylistArtistId(artistId)) {
    return artistId;
  }
  return null;
}

/**
 * Resolve the library songs.id used for cache + manifest lookup.
 * Accepts a legacy numeric id or a song row payload from the renderer.
 */
function resolveLibrarySongIdForAccess(ref) {
  if (typeof ref === 'number' && ref > 0) return ref;
  if (!ref || typeof ref !== 'object') return null;

  // Custom playlist synthetic ids always resolve from snapshot body, not catalog cache.
  if (typeof ref.id === 'number' && isUserPlaylistSongId(ref.id)) {
    return null;
  }

  if (typeof ref.library_song_id === 'number' && ref.library_song_id > 0) {
    return ref.library_song_id;
  }
  if (typeof ref.id === 'number' && ref.id > 0) {
    return ref.id;
  }
  if (ref.page_url) {
    return findLibrarySongIdByPageUrl(ref.page_url);
  }
  return null;
}

module.exports = {
  pageUrlResourceIdentity,
  findLibrarySongIdByPageUrl,
  resolveCatalogSourceArtistId,
  resolveLibrarySongIdForAccess,
  clearStalePlaylistLibrarySongId,
  snapshotAccessUrls,
  isUserPlaylistSongId,
  USER_PLAYLIST_SONG_ID_BASE,
};
