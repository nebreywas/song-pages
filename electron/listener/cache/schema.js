/**
 * SQLite metadata for on-disk song cache entries.
 * Binary assets live under userData/cache/{opaqueId}/ — not in the DB.
 */
function migrateSongCacheColumns(db) {
  const cols = db.prepare('PRAGMA table_info(song_cache)').all().map((col) => col.name);
  if (!cols.includes('html_rewrite_revision')) {
    db.exec(`ALTER TABLE song_cache ADD COLUMN html_rewrite_revision TEXT NOT NULL DEFAULT ''`);
  }
}

function initSongCacheSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS song_cache (
      id                  TEXT PRIMARY KEY,
      artist_id           INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      song_id             INTEGER NOT NULL UNIQUE REFERENCES songs(id) ON DELETE CASCADE,
      manifest_revision   TEXT NOT NULL,
      page_filename       TEXT NOT NULL DEFAULT 'page.html',
      playlist_filename   TEXT,
      total_bytes         INTEGER NOT NULL DEFAULT 0,
      html_rewrite_revision TEXT NOT NULL DEFAULT '',
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      last_accessed_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_song_cache_lru ON song_cache(last_accessed_at ASC);
    CREATE INDEX IF NOT EXISTS idx_song_cache_artist ON song_cache(artist_id);

    CREATE TABLE IF NOT EXISTS song_cache_assets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_id        TEXT NOT NULL REFERENCES song_cache(id) ON DELETE CASCADE,
      role            TEXT NOT NULL,
      remote_url      TEXT NOT NULL,
      local_filename  TEXT NOT NULL,
      bytes           INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_song_cache_assets_cache ON song_cache_assets(cache_id);
  `);

  migrateSongCacheColumns(db);
}

module.exports = { initSongCacheSchema, migrateSongCacheColumns };
