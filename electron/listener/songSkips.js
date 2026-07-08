/**
 * Per-user skip marks on subscribed catalog songs — keyed by artist + external_id
 * so skips survive catalog refresh (songs table rows are replaced on subscribe).
 */
const { getDatabase } = require('../database');

function initSongSkipsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_song_skips (
      artist_id     INTEGER NOT NULL,
      external_id   TEXT NOT NULL,
      skipped       INTEGER NOT NULL DEFAULT 1,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (artist_id, external_id)
    );

    CREATE INDEX IF NOT EXISTS idx_catalog_song_skips_artist
      ON catalog_song_skips(artist_id);
  `);
}

function getSkippedExternalIdSet(artistId) {
  const rows = getDatabase()
    .prepare(
      `SELECT external_id FROM catalog_song_skips
       WHERE artist_id = ? AND skipped = 1`,
    )
    .all(artistId);
  return new Set(rows.map((row) => row.external_id));
}

function attachSkipFlags(rows) {
  if (!rows.length) return rows;

  const artistId = rows[0].artist_id;
  const skipped = getSkippedExternalIdSet(artistId);
  return rows.map((row) => ({
    ...row,
    skipped: skipped.has(row.external_id) ? 1 : 0,
  }));
}

function attachSkipFlagsForAllArtists(rows) {
  if (!rows.length) return rows;

  const db = getDatabase();
  const artistIds = [...new Set(rows.map((row) => row.artist_id))];
  const skipByArtist = new Map();

  for (const artistId of artistIds) {
    skipByArtist.set(artistId, getSkippedExternalIdSet(artistId));
  }

  return rows.map((row) => {
    const skipped = skipByArtist.get(row.artist_id);
    return {
      ...row,
      skipped: skipped?.has(row.external_id) ? 1 : 0,
    };
  });
}

function setCatalogSongSkipped(artistId, externalId, skipped) {
  const db = getDatabase();
  if (!skipped) {
    return (
      db
        .prepare('DELETE FROM catalog_song_skips WHERE artist_id = ? AND external_id = ?')
        .run(artistId, externalId).changes > 0
    );
  }

  db.prepare(
    `INSERT INTO catalog_song_skips (artist_id, external_id, skipped, updated_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(artist_id, external_id) DO UPDATE SET
       skipped = 1,
       updated_at = datetime('now')`,
  ).run(artistId, externalId);

  return true;
}

module.exports = {
  initSongSkipsSchema,
  attachSkipFlags,
  attachSkipFlagsForAllArtists,
  setCatalogSongSkipped,
};
