/**
 * SQLite persistence for Listener Mode artists and songs (catalog mirror).
 *
 * User playlists are snapshots — not joined on read. See userPlaylists.js and
 * documentation/persistence-philosophy.md.
 */
const { getDatabase } = require('../database');

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

/** Add columns introduced after first PoC release without wiping user libraries. */
function migrateListenerSchema(db) {
  const artistCols = columnNames(db, 'artists');
  if (!artistCols.includes('artist_bio')) {
    db.exec('ALTER TABLE artists ADD COLUMN artist_bio TEXT');
  }
  if (!artistCols.includes('artist_social_json')) {
    db.exec('ALTER TABLE artists ADD COLUMN artist_social_json TEXT');
  }

  const songCols = columnNames(db, 'songs');
  if (!songCols.includes('duration_seconds')) {
    db.exec('ALTER TABLE songs ADD COLUMN duration_seconds INTEGER');
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_songs_page_url ON songs(page_url)');

  if (!artistCols.includes('song_count')) {
    db.exec('ALTER TABLE artists ADD COLUMN song_count INTEGER');
    // Backfill from imported songs for libraries created before this column existed.
    db.exec(`
      UPDATE artists SET song_count = (
        SELECT COUNT(*) FROM songs WHERE songs.artist_id = artists.id
      )
    `);
  }
}

function initListenerSchema() {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      site_url            TEXT NOT NULL UNIQUE,
      site_root_normalized TEXT NOT NULL,
      artist_slug         TEXT,
      artist_name         TEXT NOT NULL,
      artist_photo_url    TEXT,
      artist_bio          TEXT,
      artist_social_json  TEXT,
      song_count          INTEGER,
      catalog_url         TEXT,
      artist_manifest_url TEXT,
      build_version       TEXT,
      site_root_manifest  TEXT,
      last_fetched_at     TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS songs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      artist_id         INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      external_id       TEXT NOT NULL,
      slug              TEXT NOT NULL,
      title             TEXT NOT NULL,
      album             TEXT,
      year              TEXT,
      caption           TEXT,
      cover_url         TEXT,
      page_url          TEXT NOT NULL,
      playback_url      TEXT NOT NULL,
      song_manifest_url TEXT,
      playback_scope    TEXT,
      playback_quality  TEXT,
      duration_seconds  INTEGER,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      UNIQUE(artist_id, external_id)
    );

    CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);
  `);

  migrateListenerSchema(db);

  const { initLikedSongsSchema } = require('./likedSongs');
  initLikedSongsSchema(db);

  const { initSunoDemoSchema } = require('./sunoDemo/sunoDemoSongs');
  initSunoDemoSchema(db);

  const { initFlowSchema } = require('./flow/flowSongs');
  initFlowSchema(db);

  const { initUserPlaylistsSchema } = require('./userPlaylists');
  initUserPlaylistsSchema(db);

  const { migrateSunoSidebarPlaylistsToUserPlaylists } = require('./sunoDemo/migrateSunoPlaylists');
  migrateSunoSidebarPlaylistsToUserPlaylists(db);

  const { initPlaylistOrderSchema } = require('./playlistOrder');
  initPlaylistOrderSchema(db);

  const { initSongSkipsSchema } = require('./songSkips');
  initSongSkipsSchema(db);

  const { initSongCacheSchema } = require('./cache/schema');
  initSongCacheSchema(db);

  const { migrateConvenienceForeignKeys } = require('./convenienceFkMigration');
  migrateConvenienceForeignKeys(db);
}

function listArtists() {
  return getDatabase()
    .prepare(
      `SELECT a.id, a.site_url, a.site_root_normalized, a.artist_slug, a.artist_name,
              a.artist_photo_url, a.artist_bio, a.artist_social_json,
              a.build_version, a.last_fetched_at, a.created_at,
              COALESCE(
                a.song_count,
                (SELECT COUNT(*) FROM songs s WHERE s.artist_id = a.id)
              ) AS song_count
       FROM artists a
       ORDER BY a.artist_name COLLATE NOCASE ASC`
    )
    .all();
}

function getArtistById(id) {
  return getDatabase()
    .prepare(
      `SELECT id, site_url, site_root_normalized, artist_slug, artist_name,
              artist_photo_url, artist_bio, artist_social_json,
              COALESCE(
                song_count,
                (SELECT COUNT(*) FROM songs s WHERE s.artist_id = artists.id)
              ) AS song_count,
              catalog_url, artist_manifest_url, build_version,
              site_root_manifest, last_fetched_at, created_at
       FROM artists WHERE id = ?`
    )
    .get(id);
}

function listSongsForArtist(artistId) {
  const { attachSkipFlags } = require('./songSkips');
  const rows = getDatabase()
    .prepare(
      `SELECT id, artist_id, external_id, slug, title, album, year, caption,
              cover_url, page_url, playback_url, song_manifest_url,
              playback_scope, playback_quality, duration_seconds, sort_order
       FROM songs
       WHERE artist_id = ?
       ORDER BY sort_order ASC, title COLLATE NOCASE ASC`,
    )
    .all(artistId);
  return attachSkipFlags(rows);
}

function listAllSongs() {
  const { attachSkipFlagsForAllArtists } = require('./songSkips');
  const rows = getDatabase()
    .prepare(
      `SELECT s.id, s.artist_id, s.external_id, s.slug, s.title, s.album, s.year,
              s.caption, s.cover_url, s.page_url, s.playback_url, s.song_manifest_url,
              s.playback_scope, s.playback_quality, s.duration_seconds, s.sort_order,
              a.artist_name, a.site_root_normalized
       FROM songs s
       JOIN artists a ON a.id = s.artist_id
       ORDER BY a.artist_name COLLATE NOCASE ASC, s.sort_order ASC`,
    )
    .all();
  return attachSkipFlagsForAllArtists(rows);
}

function getSongById(id) {
  return getDatabase()
    .prepare(
      `SELECT id, artist_id, external_id, slug, title, album, year, caption,
              cover_url, page_url, playback_url, song_manifest_url,
              playback_scope, playback_quality, duration_seconds, sort_order
       FROM songs WHERE id = ?`,
    )
    .get(id);
}

function deleteArtist(id) {
  // Catalog mirror cleanup is partial today (artist row only; songs may orphan).
  // User playlist snapshots must survive — see documentation/persistence-philosophy.md.
  // Full mirror cleanup deferred; see documentation/OPEN-QUESTIONS.md.
  const { invalidateArtistSync } = require('./cacheManager');
  invalidateArtistSync(id);
  getDatabase().prepare('DELETE FROM artists WHERE id = ?').run(id);
}

function upsertArtistFromCatalog(options) {
  const {
    siteUrl,
    siteRootNormalized,
    catalog,
    artistManifest,
    fetchedAt,
  } = options;

  const db = getDatabase();
  const existing = db
    .prepare('SELECT id FROM artists WHERE site_url = ?')
    .get(siteUrl);

  const artistName = artistManifest?.artistName || catalog.artistName || siteUrl;
  const artistSlug = artistManifest?.artistSlug || catalog.artistSlug || null;
  const artistPhotoUrl = artistManifest?.photoUrl || catalog.artistPhotoUrl || null;
  const artistBio = artistManifest?.bio || '';
  const artistSocialJson = artistManifest?.social ? JSON.stringify(artistManifest.social) : null;
  const buildVersion = artistManifest?.buildVersion || catalog.buildVersion || null;
  const siteRootManifest = catalog.siteRoot || artistManifest?.siteRoot || null;
  // Catalog manifest songs array is the canonical count from the published site header.
  const songCount = Array.isArray(options.songs)
    ? options.songs.length
    : Array.isArray(catalog.songs)
      ? catalog.songs.length
      : 0;

  let previousRevision = null;
  /** @type {Map<string, number> | null} */
  let probedDurations = null;

  if (existing) {
    const previousArtist = getArtistById(existing.id);
    previousRevision = previousArtist?.build_version || null;

    // Keep runtime-probed lengths when refresh re-imports songs without catalog durations.
    probedDurations = new Map(
      db
        .prepare(
          `SELECT external_id, duration_seconds FROM songs
           WHERE artist_id = ? AND duration_seconds IS NOT NULL AND duration_seconds > 0`,
        )
        .all(existing.id)
        .map((row) => [row.external_id, row.duration_seconds]),
    );
  }

  const insertSong = db.prepare(
    `INSERT INTO songs (
       artist_id, external_id, slug, title, album, year, caption, cover_url,
       page_url, playback_url, song_manifest_url, playback_scope, playback_quality,
       duration_seconds, sort_order
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Artist row + song replace must commit together — avoid empty catalog on crash mid-refresh.
  const upsertCatalog = db.transaction(() => {
    let artistId;

    if (existing) {
      db.prepare(
        `UPDATE artists SET
           site_root_normalized = ?,
           artist_slug = ?,
           artist_name = ?,
           artist_photo_url = ?,
           artist_bio = ?,
           artist_social_json = ?,
           song_count = ?,
           catalog_url = ?,
           artist_manifest_url = ?,
           build_version = ?,
           site_root_manifest = ?,
           last_fetched_at = ?
         WHERE id = ?`,
      ).run(
        siteRootNormalized,
        artistSlug,
        artistName,
        artistPhotoUrl,
        artistBio,
        artistSocialJson,
        songCount,
        `${siteRootNormalized}/songpages-catalog.json`,
        artistManifest ? `${siteRootNormalized}/songpages-artist.json` : null,
        buildVersion,
        siteRootManifest,
        fetchedAt,
        existing.id,
      );
      artistId = existing.id;
      db.prepare('DELETE FROM songs WHERE artist_id = ?').run(artistId);
    } else {
      const result = db.prepare(
        `INSERT INTO artists (
           site_url, site_root_normalized, artist_slug, artist_name, artist_photo_url,
           artist_bio, artist_social_json, song_count,
           catalog_url, artist_manifest_url, build_version, site_root_manifest, last_fetched_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        siteUrl,
        siteRootNormalized,
        artistSlug,
        artistName,
        artistPhotoUrl,
        artistBio,
        artistSocialJson,
        songCount,
        `${siteRootNormalized}/songpages-catalog.json`,
        artistManifest ? `${siteRootNormalized}/songpages-artist.json` : null,
        buildVersion,
        siteRootManifest,
        fetchedAt,
      );
      artistId = Number(result.lastInsertRowid);
    }

    options.songs.forEach((song, index) => {
      const durationSeconds =
        song.durationSeconds ?? probedDurations?.get(song.externalId) ?? null;

      insertSong.run(
        artistId,
        song.externalId,
        song.slug,
        song.title,
        song.album,
        song.year,
        song.caption,
        song.coverUrl,
        song.pageUrl,
        song.playbackUrl,
        song.songManifestUrl,
        song.playbackScope,
        song.playbackQuality,
        durationSeconds,
        index,
      );
    });

    return artistId;
  });

  const artistId = upsertCatalog();

  // Filesystem cache invalidation stays outside the DB transaction.
  if (previousRevision && buildVersion && previousRevision !== buildVersion) {
    const { invalidateArtistSync } = require('./cacheManager');
    invalidateArtistSync(artistId);
  }

  return getArtistById(artistId);
}

/** Merge songpages-artist.json fields into an existing library row. */
function updateArtistFromManifest(artistId, artistManifest) {
  const db = getDatabase();
  db.prepare(
    `UPDATE artists SET
       artist_name = COALESCE(?, artist_name),
       artist_slug = COALESCE(?, artist_slug),
       artist_bio = ?,
       artist_social_json = ?,
       artist_photo_url = COALESCE(?, artist_photo_url),
       build_version = COALESCE(?, build_version)
     WHERE id = ?`
  ).run(
    artistManifest.artistName || null,
    artistManifest.artistSlug || null,
    artistManifest.bio || '',
    artistManifest.social ? JSON.stringify(artistManifest.social) : null,
    artistManifest.photoUrl || null,
    artistManifest.buildVersion || null,
    artistId
  );
  return getArtistById(artistId);
}

/** Fill in duration_seconds when we learn it at runtime (catalog refresh may already have it). */
function updateSongDurationSeconds(songId, durationSeconds) {
  const rounded = Math.round(durationSeconds);
  if (!Number.isFinite(rounded) || rounded <= 0) return false;

  const result = getDatabase()
    .prepare(
      `UPDATE songs SET duration_seconds = ?
       WHERE id = ? AND (duration_seconds IS NULL OR duration_seconds <= 0)`,
    )
    .run(rounded, songId);

  return result.changes > 0;
}

module.exports = {
  initListenerSchema,
  listArtists,
  getArtistById,
  getSongById,
  listSongsForArtist,
  listAllSongs,
  deleteArtist,
  upsertArtistFromCatalog,
  updateArtistFromManifest,
  updateSongDurationSeconds,
};
