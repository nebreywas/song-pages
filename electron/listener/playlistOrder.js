/**
 * Per-playlist manual song order — persisted when users drag-reorder tracks.
 */
const { getDatabase } = require('../database');

function initPlaylistOrderSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS playlist_custom_orders (
      playlist_key  TEXT NOT NULL,
      song_id       INTEGER NOT NULL,
      position      INTEGER NOT NULL,
      PRIMARY KEY (playlist_key, song_id)
    );

    CREATE INDEX IF NOT EXISTS idx_playlist_custom_orders_key_pos
      ON playlist_custom_orders(playlist_key, position ASC);
  `);
}

function listOrderedSongIds(playlistKey) {
  return getDatabase()
    .prepare(
      `SELECT song_id AS id FROM playlist_custom_orders
       WHERE playlist_key = ?
       ORDER BY position ASC`,
    )
    .all(playlistKey)
    .map((row) => row.id);
}

/** Keep in sync with shared/listener/playlistOrder.ts */
function syncCustomPlaylistOrder(storedOrder, currentSongIds) {
  if (storedOrder.length === 0) return [...currentSongIds];

  const currentSet = new Set(currentSongIds);
  const filtered = storedOrder.filter((id) => currentSet.has(id));
  const placed = new Set(filtered);
  const appended = currentSongIds.filter((id) => !placed.has(id));
  return [...filtered, ...appended];
}

function saveCustomOrder(playlistKey, orderedSongIds) {
  const db = getDatabase();
  const tx = db.transaction((ids) => {
    db.prepare('DELETE FROM playlist_custom_orders WHERE playlist_key = ?').run(playlistKey);
    const insert = db.prepare(
      `INSERT INTO playlist_custom_orders (playlist_key, song_id, position)
       VALUES (?, ?, ?)`,
    );
    ids.forEach((songId, index) => {
      insert.run(playlistKey, songId, index + 1);
    });
  });
  tx(orderedSongIds);
}

function clearCustomOrder(playlistKey) {
  return (
    getDatabase()
      .prepare('DELETE FROM playlist_custom_orders WHERE playlist_key = ?')
      .run(playlistKey).changes > 0
  );
}

/**
 * Load custom order for a playlist, pruning missing songs and appending new ones.
 * Persists the synced order when it changed.
 */
function getPlaylistOrderState(playlistKey, currentSongIds) {
  const stored = listOrderedSongIds(playlistKey);
  if (stored.length === 0) {
    return { hasCustomOrder: false, songIds: [] };
  }

  const synced = syncCustomPlaylistOrder(stored, currentSongIds);
  const storedKey = stored.join(',');
  const syncedKey = synced.join(',');

  if (syncedKey !== storedKey) {
    if (synced.length === 0) {
      clearCustomOrder(playlistKey);
      return { hasCustomOrder: false, songIds: [] };
    }
    saveCustomOrder(playlistKey, synced);
  }

  return { hasCustomOrder: true, songIds: synced };
}

module.exports = {
  initPlaylistOrderSchema,
  getPlaylistOrderState,
  saveCustomOrder,
  clearCustomOrder,
};
