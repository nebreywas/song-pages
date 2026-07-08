/**
 * SQLite storage for the demo Suno Only playlist.
 */
const { getDatabase } = require('../../database');
const {
  isFeatureEnabled,
  SUNO_DEMO_ARTIST_ID,
  SUNO_DEMO_SONG_ID_BASE,
  SUNO_DEMO_PLAYBACK_SCOPE,
  songIdFromRowId,
  sunoDemoManifestUrl,
  resolveInputToSongId,
  fetchStudioClip,
  lyricsFromClip,
  artistFromClip,
  coverFromClip,
  playbackFromClip,
} = require('./feature');

function initSunoDemoSchema(db) {
  if (!isFeatureEnabled()) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS suno_demo_songs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      clip_uuid         TEXT NOT NULL UNIQUE,
      title             TEXT NOT NULL,
      artist_name       TEXT NOT NULL,
      cover_url         TEXT,
      playback_url      TEXT NOT NULL,
      lyrics            TEXT NOT NULL DEFAULT '',
      source_url        TEXT NOT NULL,
      duration_seconds  INTEGER,
      added_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_suno_demo_songs_added_at ON suno_demo_songs(added_at DESC);
  `);
}

function countSunoDemoSongs() {
  if (!isFeatureEnabled()) return 0;
  return getDatabase().prepare('SELECT COUNT(*) AS count FROM suno_demo_songs').get().count;
}

function getRowBySongId(songId) {
  const rowId = SUNO_DEMO_SONG_ID_BASE - songId;
  if (rowId <= 0) return null;
  return getDatabase().prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(rowId);
}

function rowToSongRow(row) {
  const songId = songIdFromRowId(row.id);
  return {
    id: songId,
    artist_id: SUNO_DEMO_ARTIST_ID,
    external_id: row.clip_uuid,
    slug: row.clip_uuid,
    title: row.title,
    album: null,
    year: null,
    caption: null,
    cover_url: row.cover_url,
    page_url: `songpages-suno-demo:page/${songId}`,
    playback_url: row.playback_url,
    song_manifest_url: sunoDemoManifestUrl(songId),
    playback_scope: SUNO_DEMO_PLAYBACK_SCOPE,
    playback_quality: 'standard',
    duration_seconds: row.duration_seconds,
    sort_order: row.id,
    artist_name: row.artist_name,
    site_root_normalized: '',
  };
}

function listSunoDemoSongs() {
  if (!isFeatureEnabled()) return [];
  const rows = getDatabase()
    .prepare('SELECT * FROM suno_demo_songs ORDER BY added_at DESC')
    .all();
  return rows.map(rowToSongRow);
}

function buildManifestForSongId(songId) {
  const row = getRowBySongId(songId);
  if (!row) return null;

  return {
    schemaVersion: 1,
    siteRoot: '',
    artistSlug: 'suno-only',
    artistName: row.artist_name,
    id: row.clip_uuid,
    slug: row.clip_uuid,
    title: row.title,
    album: '',
    year: '',
    caption: '',
    about: '',
    lyrics: row.lyrics || '',
    coverUrl: row.cover_url,
    extraImageUrl: null,
    pageUrl: `songpages-suno-demo:page/${songId}`,
    playbackUrl: row.playback_url,
    streamLinks: { youtube: '', spotify: '', soundcloud: '' },
    playbackScope: 'full',
    playbackQuality: 'standard',
    buildVersion: 'suno-demo',
    durationSeconds: row.duration_seconds,
  };
}

async function addSunoDemoSongByUrl(input) {
  if (!isFeatureEnabled()) {
    return { ok: false, error: 'Suno demo feature is disabled.' };
  }

  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a Suno share URL or clip UUID.' };
  }

  const clipUuid = await resolveInputToSongId(trimmed);
  if (!clipUuid) {
    return { ok: false, error: 'Could not parse a Suno clip UUID from that input.' };
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM suno_demo_songs WHERE clip_uuid = ?').get(clipUuid);
  if (existing) {
    const song = rowToSongRow(db.prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(existing.id));
    return { ok: true, data: { song, duplicate: true, count: countSunoDemoSongs() } };
  }

  let clip;
  try {
    clip = await fetchStudioClip(clipUuid);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }

  const title = String(clip.title || 'Untitled').trim() || 'Untitled';
  const artistName = String(artistFromClip(clip)).trim() || 'Suno';
  const coverUrl = coverFromClip(clip, clipUuid);
  const playbackUrl = playbackFromClip(clip, clipUuid);
  const lyrics = lyricsFromClip(clip);
  const durationSeconds =
    typeof clip.metadata?.duration === 'number' && clip.metadata.duration > 0
      ? Math.round(clip.metadata.duration)
      : null;

  const insert = db
    .prepare(
      `INSERT INTO suno_demo_songs (
         clip_uuid, title, artist_name, cover_url, playback_url, lyrics, source_url, duration_seconds
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(clipUuid, title, artistName, coverUrl, playbackUrl, lyrics, trimmed, durationSeconds);

  const row = db.prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(insert.lastInsertRowid);
  const song = rowToSongRow(row);

  return { ok: true, data: { song, duplicate: false, count: countSunoDemoSongs() } };
}

function updateSunoDemoSongDuration(songId, durationSeconds) {
  if (!isFeatureEnabled()) return false;
  const row = getRowBySongId(songId);
  if (!row) return false;
  const rounded = Math.round(durationSeconds);
  if (rounded <= 0) return false;
  return (
    getDatabase()
      .prepare('UPDATE suno_demo_songs SET duration_seconds = ? WHERE id = ?')
      .run(rounded, row.id).changes > 0
  );
}

function removeSunoDemoSong(songId) {
  if (!isFeatureEnabled()) return { count: 0 };
  const row = getRowBySongId(songId);
  if (!row) return { count: countSunoDemoSongs() };
  getDatabase().prepare('DELETE FROM suno_demo_songs WHERE id = ?').run(row.id);
  return { count: countSunoDemoSongs() };
}

module.exports = {
  initSunoDemoSchema,
  countSunoDemoSongs,
  listSunoDemoSongs,
  addSunoDemoSongByUrl,
  buildManifestForSongId,
  getRowBySongId,
  updateSunoDemoSongDuration,
  removeSunoDemoSong,
};
