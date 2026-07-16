/**
 * Artist 2.0 catalog tables — hybrid SQLite index + JSON payloads.
 * Separate from Listener Mode `artists` / `songs` (subscribe mirrors).
 */

function initArtist2Schema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS artist2_artists (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS artist2_objects (
      id           TEXT PRIMARY KEY,
      artist_id    TEXT NOT NULL,
      kind         TEXT NOT NULL,
      content_type TEXT,
      name         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'draft',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (artist_id) REFERENCES artist2_artists(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_artist2_objects_artist
      ON artist2_objects(artist_id, kind, name);

    CREATE TABLE IF NOT EXISTS artist2_memberships (
      id           TEXT PRIMARY KEY,
      container_id TEXT NOT NULL,
      member_id    TEXT NOT NULL,
      position     INTEGER NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      UNIQUE(container_id, member_id),
      FOREIGN KEY (container_id) REFERENCES artist2_objects(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES artist2_objects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_artist2_memberships_container
      ON artist2_memberships(container_id, position);

    CREATE TABLE IF NOT EXISTS artist2_deletion_reports (
      id                   TEXT PRIMARY KEY,
      artist_id            TEXT NOT NULL,
      deleted_object_id    TEXT NOT NULL,
      deleted_kind         TEXT NOT NULL,
      deleted_name         TEXT NOT NULL,
      deleted_content_type TEXT,
      deleted_at           TEXT NOT NULL,
      snapshot_json        TEXT NOT NULL DEFAULT '{}',
      broken_refs_json     TEXT NOT NULL DEFAULT '[]',
      created_at           TEXT NOT NULL,
      cleared_at           TEXT,
      FOREIGN KEY (artist_id) REFERENCES artist2_artists(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_artist2_deletion_reports_artist
      ON artist2_deletion_reports(artist_id, cleared_at, created_at DESC);
  `);

  // Idempotent migrations for existing installs.
  const objectCols = db.prepare(`PRAGMA table_info(artist2_objects)`).all();
  if (!objectCols.some((col) => col.name === 'deleted_at')) {
    db.exec(`ALTER TABLE artist2_objects ADD COLUMN deleted_at TEXT`);
  }
}

module.exports = { initArtist2Schema };
