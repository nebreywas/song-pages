/**
 * Cross-artist liked songs — bookmarks stored separately from artist catalogs.
 */
const { getDatabase } = require('../database');

function initLikedSongsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS liked_songs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id           INTEGER UNIQUE REFERENCES songs(id) ON DELETE SET NULL,
      source_artist_id  INTEGER,
      artist_name       TEXT NOT NULL,
      title             TEXT NOT NULL,
      album             TEXT,
      year              TEXT,
      page_url          TEXT NOT NULL,
      playback_url      TEXT NOT NULL,
      external_id       TEXT,
      duration_seconds  INTEGER,
      liked_at          TEXT NOT NULL DEFAULT (datetime('now')),
      unavailable       INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_liked_songs_liked_at ON liked_songs(liked_at DESC);
  `);
}

function countLikedSongs() {
  return getDatabase().prepare('SELECT COUNT(*) AS count FROM liked_songs').get().count;
}

/** Library song ids currently liked — for playlist row markers. */
function listLikedSongIds() {
  return getDatabase()
    .prepare('SELECT song_id AS id FROM liked_songs WHERE song_id IS NOT NULL')
    .all()
    .map((row) => row.id);
}

function isSongLiked(songId) {
  const row = getDatabase().prepare('SELECT 1 FROM liked_songs WHERE song_id = ?').get(songId);
  return Boolean(row);
}

function getSongSnapshot(songId) {
  return getDatabase()
    .prepare(
      `SELECT s.id, s.artist_id, s.external_id, s.slug, s.title, s.album, s.year, s.caption,
              s.cover_url, s.page_url, s.playback_url, s.song_manifest_url,
              s.playback_scope, s.playback_quality, s.duration_seconds, s.sort_order,
              a.artist_name, a.site_root_normalized
       FROM songs s
       JOIN artists a ON a.id = s.artist_id
       WHERE s.id = ?`,
    )
    .get(songId);
}

function toggleLikeSong(songId) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM liked_songs WHERE song_id = ?').get(songId);

  if (existing) {
    db.prepare('DELETE FROM liked_songs WHERE song_id = ?').run(songId);
    return { liked: false, count: countLikedSongs() };
  }

  const song = getSongSnapshot(songId);
  if (!song) {
    throw new Error('Song not found in library.');
  }

  db.prepare(
    `INSERT INTO liked_songs (
       song_id, source_artist_id, artist_name, title, album, year,
       page_url, playback_url, external_id, duration_seconds, unavailable
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    song.id,
    song.artist_id,
    song.artist_name,
    song.title,
    song.album,
    song.year,
    song.page_url,
    song.playback_url,
    song.external_id,
    song.duration_seconds,
  );

  return { liked: true, count: countLikedSongs() };
}

/** Liked playlist rows — prefer live song data when the library row still exists. */
function listLikedSongs() {
  return getDatabase()
    .prepare(
      `SELECT
         ls.id AS liked_id,
         ls.unavailable,
         CASE WHEN s.id IS NOT NULL THEN s.id ELSE -ls.id END AS id,
         COALESCE(s.artist_id, ls.source_artist_id) AS artist_id,
         COALESCE(s.external_id, ls.external_id) AS external_id,
         COALESCE(s.slug, '') AS slug,
         COALESCE(s.title, ls.title) AS title,
         COALESCE(s.album, ls.album) AS album,
         COALESCE(s.year, ls.year) AS year,
         s.caption,
         s.cover_url,
         COALESCE(s.page_url, ls.page_url) AS page_url,
         COALESCE(s.playback_url, ls.playback_url) AS playback_url,
         s.song_manifest_url,
         s.playback_scope,
         s.playback_quality,
         COALESCE(s.duration_seconds, ls.duration_seconds) AS duration_seconds,
         ls.id AS sort_order,
         ls.liked_at AS added_at,
         COALESCE(a.artist_name, ls.artist_name) AS artist_name,
         a.site_root_normalized
       FROM liked_songs ls
       LEFT JOIN songs s ON s.id = ls.song_id
       LEFT JOIN artists a ON a.id = COALESCE(s.artist_id, ls.source_artist_id)
       ORDER BY ls.liked_at DESC`,
    )
    .all();
}

/** Persist lazy availability probe — NULL = never checked, 0 = ok, 1 = unavailable. */
function setLikedSongAvailability(songId, unavailable) {
  const db = getDatabase();
  const value = unavailable == null ? null : unavailable ? 1 : 0;

  if (songId < 0) {
    return db.prepare('UPDATE liked_songs SET unavailable = ? WHERE id = ?').run(value, -songId).changes > 0;
  }

  return db.prepare('UPDATE liked_songs SET unavailable = ? WHERE song_id = ?').run(value, songId).changes > 0;
}

/** Remove a row from the Liked Songs personal playlist. */
function removeLikedSong({ songId, likedId }) {
  const db = getDatabase();
  if (songId > 0) {
    db.prepare('DELETE FROM liked_songs WHERE song_id = ?').run(songId);
  } else if (likedId != null) {
    db.prepare('DELETE FROM liked_songs WHERE id = ?').run(likedId);
  } else {
    throw new Error('Cannot remove liked song without a library or liked row id.');
  }
  return { count: countLikedSongs() };
}

module.exports = {
  initLikedSongsSchema,
  countLikedSongs,
  listLikedSongIds,
  isSongLiked,
  toggleLikeSong,
  listLikedSongs,
  setLikedSongAvailability,
  removeLikedSong,
};
