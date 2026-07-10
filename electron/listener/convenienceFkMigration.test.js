const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, afterEach } = require('node:test');

const database = require('../database');
const {
  foreignKeyFromColumn,
  migrateConvenienceForeignKeys,
} = require('./convenienceFkMigration');

let tmpDir = null;

afterEach(() => {
  database.closeTestDatabase();
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  tmpDir = null;
});

function openLegacyConvenienceFkDb() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'songpages-fk-migration-test-'));
  const dbPath = path.join(tmpDir, 'app.db');
  database.openTestDatabase(dbPath);
  const db = database.getDatabase();

  // Simulate pre-Slice-I DDL: convenience columns declared with REFERENCES.
  db.exec('DROP TABLE IF EXISTS user_playlist_songs');
  db.exec('DROP TABLE IF EXISTS liked_songs');

  db.exec(`
    CREATE TABLE user_playlist_songs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id       INTEGER NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
      library_song_id   INTEGER REFERENCES songs(id) ON DELETE SET NULL,
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

    CREATE TABLE liked_songs (
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
  `);

  return db;
}

test('migrateConvenienceForeignKeys removes convenience FK metadata from DDL', () => {
  const db = openLegacyConvenienceFkDb();

  assert.ok(foreignKeyFromColumn(db, 'user_playlist_songs', 'library_song_id'));
  assert.ok(foreignKeyFromColumn(db, 'liked_songs', 'song_id'));

  migrateConvenienceForeignKeys(db);

  assert.equal(foreignKeyFromColumn(db, 'user_playlist_songs', 'library_song_id'), null);
  assert.equal(foreignKeyFromColumn(db, 'liked_songs', 'song_id'), null);

  // Ownership FK on playlist container remains for future scoped enablement.
  const playlistFk = foreignKeyFromColumn(db, 'user_playlist_songs', 'playlist_id');
  assert.ok(playlistFk);
  assert.equal(playlistFk.table, 'user_playlists');
});

test('migrateConvenienceForeignKeys preserves snapshot rows and stale library_song_id', () => {
  const db = openLegacyConvenienceFkDb();

  const artistInsert = db
    .prepare(
      `INSERT INTO artists (site_url, site_root_normalized, artist_name)
       VALUES ('https://artist.example', 'https://artist.example', 'Artist')`,
    )
    .run();
  const artistId = artistInsert.lastInsertRowid;

  const songInsert = db
    .prepare(
      `INSERT INTO songs (
         artist_id, external_id, slug, title, page_url, playback_url, sort_order
       ) VALUES (?, 'ext-1', 'slug-1', 'Song One', 'https://artist.example/s/1', 'https://artist.example/a/1', 0)`,
    )
    .run(artistId);
  const songId = songInsert.lastInsertRowid;

  const playlistInsert = db.prepare(`INSERT INTO user_playlists (name) VALUES ('Test')`).run();
  const playlistId = playlistInsert.lastInsertRowid;

  db.prepare(
    `INSERT INTO user_playlist_songs (
       playlist_id, library_song_id, artist_name, title, page_url, playback_url
     ) VALUES (?, ?, 'Artist', 'Song One', 'https://artist.example/s/1', 'https://artist.example/a/1')`,
  ).run(playlistId, songId);

  migrateConvenienceForeignKeys(db);

  db.prepare('DELETE FROM songs WHERE id = ?').run(songId);

  const row = db
    .prepare('SELECT library_song_id, title FROM user_playlist_songs WHERE playlist_id = ?')
    .get(playlistId);

  assert.equal(row.library_song_id, songId, 'stale convenience id should remain after catalog delete');
  assert.equal(row.title, 'Song One');
});

test('fresh schema init has no convenience FK metadata', () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'songpages-fk-migration-test-'));
  database.openTestDatabase(path.join(tmpDir, 'app.db'));
  const db = database.getDatabase();

  assert.equal(foreignKeyFromColumn(db, 'user_playlist_songs', 'library_song_id'), null);
  assert.equal(foreignKeyFromColumn(db, 'liked_songs', 'song_id'), null);
});
