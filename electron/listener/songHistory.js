const { getDatabase } = require('../database');

const MAX_ENTRIES = 1000;
/** Ignore tiny seek deltas (noise from scrub pointer jitter). */
const MIN_SEEK_DELTA_SECONDS = 0.5;

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

    -- Seek interactions attached to a history start. Denormalized song/playlist
    -- ids let us aggregate after playlist deletion without joining live tables.
    CREATE TABLE IF NOT EXISTS song_history_seeks (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      history_entry_id   INTEGER NOT NULL,
      song_id            INTEGER NOT NULL,
      playlist_id        INTEGER,
      direction          TEXT NOT NULL,
      from_seconds       REAL NOT NULL,
      to_seconds         REAL NOT NULL,
      created_at         TEXT NOT NULL,
      FOREIGN KEY (history_entry_id) REFERENCES song_history(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_song_history_seeks_entry
      ON song_history_seeks(history_entry_id);
    CREATE INDEX IF NOT EXISTS idx_song_history_seeks_song
      ON song_history_seeks(song_id);
  `);
}

function pruneOldEntries(db) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM song_history').get()?.count ?? 0;
  if (count <= MAX_ENTRIES) return;

  const excess = count - MAX_ENTRIES;
  // Delete seeks for pruned rows first (SQLite FK cascade may be off).
  db.prepare(
    `DELETE FROM song_history_seeks
     WHERE history_entry_id IN (
       SELECT id FROM song_history
       ORDER BY started_at ASC, id ASC
       LIMIT ?
     )`,
  ).run(excess);

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

function mapSeekRow(row) {
  return {
    id: row.id,
    historyEntryId: row.history_entry_id,
    songId: row.song_id,
    playlistId: row.playlist_id,
    direction: row.direction === 'back' ? 'back' : 'forward',
    fromSeconds: row.from_seconds ?? 0,
    toSeconds: row.to_seconds ?? 0,
    createdAt: row.created_at,
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

/**
 * Record a seekbar interaction against the active history start.
 * Stores from→to so we can later refine play estimates without re-deriving
 * continuous listen time from wall clocks.
 */
function recordSongHistorySeek(input) {
  if (!input || typeof input.historyEntryId !== 'number' || !Number.isFinite(input.historyEntryId)) {
    return { ok: false, error: 'Invalid history entry id.' };
  }
  const fromSeconds = Number(input.fromSeconds);
  const toSeconds = Number(input.toSeconds);
  if (!Number.isFinite(fromSeconds) || !Number.isFinite(toSeconds)) {
    return { ok: false, error: 'Invalid seek positions.' };
  }
  if (Math.abs(toSeconds - fromSeconds) < MIN_SEEK_DELTA_SECONDS) {
    return { ok: true, data: null, skipped: true };
  }

  const db = getDatabase();
  const entry = db.prepare('SELECT * FROM song_history WHERE id = ?').get(input.historyEntryId);
  if (!entry) return { ok: false, error: 'History entry not found.' };

  const direction =
    input.direction === 'forward' || input.direction === 'back'
      ? input.direction
      : toSeconds >= fromSeconds
        ? 'forward'
        : 'back';

  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO song_history_seeks (
        history_entry_id, song_id, playlist_id, direction,
        from_seconds, to_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.id,
      entry.song_id,
      entry.playlist_id,
      direction,
      fromSeconds,
      toSeconds,
      createdAt,
    );

  const row = db.prepare('SELECT * FROM song_history_seeks WHERE id = ?').get(result.lastInsertRowid);
  return { ok: true, data: mapSeekRow(row) };
}

/** History entry ids that have at least one seek (for play-estimate math). */
function listSongHistorySeekHitEntryIds(limit = MAX_ENTRIES) {
  const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), MAX_ENTRIES);
  const rows = getDatabase()
    .prepare(
      `SELECT DISTINCT history_entry_id AS id
       FROM song_history_seeks
       WHERE history_entry_id IN (
         SELECT id FROM song_history
         ORDER BY started_at DESC, id DESC
         LIMIT ?
       )`,
    )
    .all(safeLimit);
  return rows.map((row) => row.id);
}

function listSongHistorySeeksForEntry(historyEntryId) {
  if (typeof historyEntryId !== 'number' || !Number.isFinite(historyEntryId)) return [];
  return getDatabase()
    .prepare(
      `SELECT * FROM song_history_seeks
       WHERE history_entry_id = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .all(historyEntryId)
    .map(mapSeekRow);
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
  const db = getDatabase();
  db.prepare('DELETE FROM song_history_seeks').run();
  db.prepare('DELETE FROM song_history').run();
  return { ok: true };
}

module.exports = {
  initSongHistorySchema,
  recordSongHistoryStart,
  updateSongHistoryEntry,
  recordSongHistorySeek,
  listSongHistorySeekHitEntryIds,
  listSongHistorySeeksForEntry,
  listSongHistory,
  clearSongHistory,
};
