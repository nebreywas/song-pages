/**
 * Demo Suno playlists — each playlist maps to a negative sidebar artist id (-playlistId).
 */
const { getDatabase } = require('../../database');
const { isFeatureEnabled, sunoPlaylistArtistId } = require('./feature');

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function initSunoDemoPlaylistsSchema(db) {
  if (!isFeatureEnabled()) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS suno_demo_playlists (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const songCols = columnNames(db, 'suno_demo_songs');
  if (songCols.length && !songCols.includes('playlist_id')) {
    db.exec('ALTER TABLE suno_demo_songs ADD COLUMN playlist_id INTEGER REFERENCES suno_demo_playlists(id)');
  }

  migrateOrphanSunoSongs(db);
}

/** Safe to call before any Suno playlist query — repairs libraries opened before migration ran. */
function ensureSunoDemoLibraryReady() {
  if (!isFeatureEnabled()) return;
  const db = getDatabase();
  initSunoDemoPlaylistsSchema(db);
}

/** Existing imports before playlists existed land in a restored "Suno Only" playlist. */
function migrateOrphanSunoSongs(db) {
  const orphanCount = db
    .prepare('SELECT COUNT(*) AS count FROM suno_demo_songs WHERE playlist_id IS NULL')
    .get().count;
  if (orphanCount === 0) return;

  let playlist = db.prepare('SELECT id FROM suno_demo_playlists ORDER BY id ASC LIMIT 1').get();
  if (!playlist) {
    const legacyName = 'Suno Only';
    const insert = db.prepare('INSERT INTO suno_demo_playlists (name) VALUES (?)').run(legacyName);
    playlist = { id: insert.lastInsertRowid };
  }

  db.prepare('UPDATE suno_demo_songs SET playlist_id = ? WHERE playlist_id IS NULL').run(playlist.id);
}

function listSunoDemoPlaylists() {
  if (!isFeatureEnabled()) return [];
  ensureSunoDemoLibraryReady();
  return getDatabase()
    .prepare(
      `SELECT p.id, p.name, p.created_at,
              (SELECT COUNT(*) FROM suno_demo_songs s WHERE s.playlist_id = p.id) AS song_count
       FROM suno_demo_playlists p
       ORDER BY p.id ASC`,
    )
    .all();
}

function getSunoDemoPlaylistById(playlistId) {
  if (!isFeatureEnabled() || !playlistId) return null;
  return getDatabase()
    .prepare(
      `SELECT p.id, p.name, p.created_at,
              (SELECT COUNT(*) FROM suno_demo_songs s WHERE s.playlist_id = p.id) AS song_count
       FROM suno_demo_playlists p
       WHERE p.id = ?`,
    )
    .get(playlistId);
}

function nextSunoPlaylistName(db) {
  const rows = db.prepare(`SELECT name FROM suno_demo_playlists WHERE name LIKE 'Suno %'`).all();
  let max = 0;
  for (const row of rows) {
    const match = /^Suno\s+(\d+)$/i.exec(String(row.name ?? '').trim());
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `Suno ${max + 1}`;
}

function createSunoDemoPlaylist() {
  if (!isFeatureEnabled()) {
    return { ok: false, error: 'Suno demo feature is disabled.' };
  }

  const db = getDatabase();
  const name = nextSunoPlaylistName(db);
  const insert = db.prepare('INSERT INTO suno_demo_playlists (name) VALUES (?)').run(name);
  const playlist = getSunoDemoPlaylistById(insert.lastInsertRowid);

  return {
    ok: true,
    data: {
      ...playlist,
      artist_id: sunoPlaylistArtistId(playlist.id),
    },
  };
}

/** First playlist for imports when none is selected — creates Suno 1 if needed. */
function ensureDefaultSunoDemoPlaylistId() {
  if (!isFeatureEnabled()) return null;
  ensureSunoDemoLibraryReady();
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM suno_demo_playlists ORDER BY id ASC LIMIT 1').get();
  if (existing) return existing.id;

  const insert = db.prepare('INSERT INTO suno_demo_playlists (name) VALUES (?)').run('Suno 1');
  return insert.lastInsertRowid;
}

function renameSunoDemoPlaylist(playlistId, name) {
  if (!isFeatureEnabled()) {
    return { ok: false, error: 'Suno demo feature is disabled.' };
  }
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { ok: false, error: 'Playlist name cannot be empty.' };
  const existing = getSunoDemoPlaylistById(playlistId);
  if (!existing) return { ok: false, error: 'Suno playlist not found.' };
  getDatabase().prepare('UPDATE suno_demo_playlists SET name = ? WHERE id = ?').run(trimmed, playlistId);
  const playlist = getSunoDemoPlaylistById(playlistId);
  return { ok: true, data: { ...playlist, artist_id: sunoPlaylistArtistId(playlist.id) } };
}

function removeSunoDemoPlaylist(playlistId) {
  if (!isFeatureEnabled()) {
    return { ok: false, error: 'Suno demo feature is disabled.' };
  }

  ensureSunoDemoLibraryReady();
  const playlist = getSunoDemoPlaylistById(playlistId);
  if (!playlist) {
    return { ok: false, error: 'Suno playlist not found.' };
  }

  const db = getDatabase();
  db.prepare('DELETE FROM suno_demo_songs WHERE playlist_id = ?').run(playlistId);
  db.prepare('DELETE FROM suno_demo_playlists WHERE id = ?').run(playlistId);

  const { clearCustomOrder } = require('../playlistOrder');
  clearCustomOrder(`suno:${playlistId}`);
  if (playlistId === 1) {
    clearCustomOrder('suno');
  }

  return {
    ok: true,
    data: {
      artist_id: sunoPlaylistArtistId(playlistId),
      name: playlist.name,
      song_count: playlist.song_count,
    },
  };
}

module.exports = {
  initSunoDemoPlaylistsSchema,
  ensureSunoDemoLibraryReady,
  listSunoDemoPlaylists,
  getSunoDemoPlaylistById,
  createSunoDemoPlaylist,
  ensureDefaultSunoDemoPlaylistId,
  renameSunoDemoPlaylist,
  removeSunoDemoPlaylist,
};
