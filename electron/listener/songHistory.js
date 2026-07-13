const { getDatabase } = require('../database');

const MAX_ENTRIES = 1000;

function initSongHistorySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS song_history (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id               INTEGER NOT NULL,
      song_title            TEXT NOT NULL,
      artist_name           TEXT,
      playlist_id           INTEGER,
      playlist_name         TEXT,
      started_at            TEXT NOT NULL,
      completed             INTEGER NOT NULL DEFAULT 0,
      playback_seconds      REAL NOT NULL DEFAULT 0,
      duration_seconds      REAL,
      interrupted           INTEGER NOT NULL DEFAULT 0,
      interrupted_previous  INTEGER NOT NULL DEFAULT 0,
      playback_type         TEXT NOT NULL DEFAULT 'normal',
      vc_mode               INTEGER NOT NULL DEFAULT 0,
      vc_mode_label         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_song_history_started_at
      ON song_history(started_at DESC);
  `);
}

function pruneOldEntries(db) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM song_history').get()?.count ?? 0;
  if (count <= MAX_ENTRIES) return;

  const excess = count - MAX_ENTRIES;
  db.prepare(
    `DELETE FROM song_history
     WHERE id IN (
       SELECT id FROM song_history
       ORDER BY started_at ASC, id ASC
       LIMIT ?
     )`,
  ).run(excess);
}

function mapRow(row) {
  return {
    id: row.id,
    songId: row.song_id,
    songTitle: row.song_title,
    artistName: row.artist_name,
    playlistId: row.playlist_id,
    playlistName: row.playlist_name,
    startedAt: row.started_at,
    completed: row.completed === 1,
    playbackSeconds: row.playback_seconds ?? 0,
    durationSeconds: row.duration_seconds,
    interrupted: row.interrupted === 1,
    interruptedPrevious: row.interrupted_previous === 1,
    playbackType: row.playback_type,
    vcMode: row.vc_mode === 1,
    vcModeLabel: row.vc_mode_label,
  };
}

function recordSongHistoryStart(input) {
  const db = getDatabase();
  const startedAt = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO song_history (
        song_id, song_title, artist_name, playlist_id, playlist_name, started_at,
        completed, playback_seconds, duration_seconds, interrupted, interrupted_previous,
        playback_type, vc_mode, vc_mode_label
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, ?, ?, ?, ?)`,
    )
    .run(
      input.songId,
      input.songTitle,
      input.artistName ?? null,
      input.playlistId ?? null,
      input.playlistName ?? null,
      startedAt,
      input.durationSeconds ?? null,
      input.interruptedPrevious ? 1 : 0,
      input.playbackType ?? 'normal',
      input.vcMode ? 1 : 0,
      input.vcModeLabel ?? null,
    );

  pruneOldEntries(db);
  return mapRow(db.prepare('SELECT * FROM song_history WHERE id = ?').get(result.lastInsertRowid));
}

function updateSongHistoryEntry(entryId, patch) {
  if (typeof entryId !== 'number' || !Number.isFinite(entryId)) {
    return { ok: false, error: 'Invalid history entry id.' };
  }

  const fields = [];
  const values = [];

  if (patch.completed != null) {
    fields.push('completed = ?');
    values.push(patch.completed ? 1 : 0);
  }
  if (patch.playbackSeconds != null) {
    fields.push('playback_seconds = ?');
    values.push(patch.playbackSeconds);
  }
  if (patch.durationSeconds !== undefined) {
    fields.push('duration_seconds = ?');
    values.push(patch.durationSeconds);
  }
  if (patch.interrupted != null) {
    fields.push('interrupted = ?');
    values.push(patch.interrupted ? 1 : 0);
  }

  if (!fields.length) {
    return { ok: false, error: 'No history fields to update.' };
  }

  const db = getDatabase();
  const changes = db
    .prepare(`UPDATE song_history SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values, entryId).changes;

  if (!changes) return { ok: false, error: 'History entry not found.' };
  const row = db.prepare('SELECT * FROM song_history WHERE id = ?').get(entryId);
  return { ok: true, data: mapRow(row) };
}

function listSongHistory(limit = MAX_ENTRIES) {
  const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), MAX_ENTRIES);
  const rows = getDatabase()
    .prepare(
      `SELECT * FROM song_history
       ORDER BY started_at DESC, id DESC
       LIMIT ?`,
    )
    .all(safeLimit);
  return rows.map(mapRow);
}

function clearSongHistory() {
  getDatabase().prepare('DELETE FROM song_history').run();
  return { ok: true };
}

module.exports = {
  initSongHistorySchema,
  recordSongHistoryStart,
  updateSongHistoryEntry,
  listSongHistory,
  clearSongHistory,
};
