/**
 * Strip convenience-reference foreign keys from table DDL.
 *
 * Song Pages enables ownership FKs only (see documentation/persistence-philosophy.md).
 * Convenience columns such as library_song_id and liked_songs.song_id must remain
 * optional stale hints — not enforced relational dependencies.
 *
 * SQLite cannot drop a column constraint in place; when legacy FK metadata is
 * detected via PRAGMA foreign_key_list we rebuild the affected table.
 */

function tableExists(db, table) {
  const row = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row);
}

function foreignKeyFromColumn(db, table, column) {
  return db.pragma(`foreign_key_list(${table})`).find((fk) => fk.from === column) ?? null;
}

function rebuildUserPlaylistSongsWithoutLibraryFk(db) {
  db.exec(`
    CREATE TABLE user_playlist_songs__fk_migration (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id       INTEGER NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
      library_song_id   INTEGER,
      source_artist_id  INTEGER,
      artist_name       TEXT NOT NULL,
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
      external_id       TEXT,
      duration_seconds  INTEGER,
      site_root_normalized TEXT,
      added_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO user_playlist_songs__fk_migration
    SELECT
      id, playlist_id, library_song_id, source_artist_id, artist_name, title, album, year,
      caption, cover_url, page_url, playback_url, song_manifest_url, playback_scope,
      playback_quality, external_id, duration_seconds, site_root_normalized, added_at
    FROM user_playlist_songs;

    DROP TABLE user_playlist_songs;
    ALTER TABLE user_playlist_songs__fk_migration RENAME TO user_playlist_songs;

    CREATE INDEX IF NOT EXISTS idx_user_playlist_songs_playlist ON user_playlist_songs(playlist_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlist_songs_library
      ON user_playlist_songs(playlist_id, library_song_id)
      WHERE library_song_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlist_songs_page
      ON user_playlist_songs(playlist_id, page_url)
      WHERE library_song_id IS NULL;
  `);
}

function rebuildLikedSongsWithoutSongFk(db) {
  db.exec(`
    CREATE TABLE liked_songs__fk_migration (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id           INTEGER UNIQUE,
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

    INSERT INTO liked_songs__fk_migration
    SELECT
      id, song_id, source_artist_id, artist_name, title, album, year,
      page_url, playback_url, external_id, duration_seconds, liked_at, unavailable
    FROM liked_songs;

    DROP TABLE liked_songs;
    ALTER TABLE liked_songs__fk_migration RENAME TO liked_songs;

    CREATE INDEX IF NOT EXISTS idx_liked_songs_liked_at ON liked_songs(liked_at DESC);
  `);
}

/**
 * Idempotent startup migration — no-op when DDL already matches ownership-only policy.
 */
function migrateConvenienceForeignKeys(db) {
  const run = db.transaction(() => {
    if (tableExists(db, 'user_playlist_songs') && foreignKeyFromColumn(db, 'user_playlist_songs', 'library_song_id')) {
      rebuildUserPlaylistSongsWithoutLibraryFk(db);
    }

    if (tableExists(db, 'liked_songs') && foreignKeyFromColumn(db, 'liked_songs', 'song_id')) {
      rebuildLikedSongsWithoutSongFk(db);
    }
  });

  run();
}

module.exports = {
  foreignKeyFromColumn,
  migrateConvenienceForeignKeys,
  rebuildLikedSongsWithoutSongFk,
  rebuildUserPlaylistSongsWithoutLibraryFk,
};
