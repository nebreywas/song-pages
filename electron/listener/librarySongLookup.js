/**
 * Match playlist snapshots to subscribed catalog songs by canonical page URL.
 */
const { getDatabase } = require('../database');

const USER_PLAYLIST_ARTIST_ID_BASE = -10_000;

function isUserPlaylistArtistId(artistId) {
  return typeof artistId === 'number' && artistId <= USER_PLAYLIST_ARTIST_ID_BASE - 1;
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
  const identity = pageUrlResourceIdentity(pageUrl);
  if (!identity) return null;
  const rows = getDatabase().prepare('SELECT id, page_url FROM songs').all();
  for (const row of rows) {
    if (pageUrlResourceIdentity(row.page_url) === identity) return row.id;
  }
  return null;
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
};
