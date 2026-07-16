/**
 * SQLite storage for demo Suno playlist tracks.
 */
const { getDatabase } = require('../../database');
const {
  isFeatureEnabled,
  SUNO_DEMO_SONG_ID_BASE,
  SUNO_DEMO_PLAYBACK_SCOPE,
  songIdFromRowId,
  rowIdFromSongId,
  sunoDemoManifestUrl,
  sunoDemoPageUrlFromClipUuid,
  sunoPlaylistArtistId,
  resolveInputToSongId,
  fetchStudioClip,
  lyricsFromClip,
  artistFromClip,
  yearFromClip,
  coverFromClip,
  resolveSunoCoverUrl,
  playbackFromClip,
} = require('./feature');
const {
  SUNO_SNAPSHOT_REFRESH_MS,
  isStoredTimestampOlderThan,
} = require('../cacheRefreshPolicy');
const {
  initSunoDemoPlaylistsSchema,
  ensureSunoDemoLibraryReady,
  ensureDefaultSunoDemoPlaylistId,
  getSunoDemoPlaylistById,
} = require('./sunoDemoPlaylists');
const {
  metadataFromSunoClip,
  serializeSunoProviderMetadata,
  parseSunoProviderMetadata,
} = require('./clipMetadata');

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

  initSunoDemoPlaylistsSchema(db);

  const cols = db.prepare('PRAGMA table_info(suno_demo_songs)').all().map((col) => col.name);
  if (!cols.includes('metadata_refreshed_at')) {
    db.exec('ALTER TABLE suno_demo_songs ADD COLUMN metadata_refreshed_at TEXT');
    db.exec(
      `UPDATE suno_demo_songs SET metadata_refreshed_at = COALESCE(added_at, datetime('now'))
       WHERE metadata_refreshed_at IS NULL`,
    );
  }
}

function countSunoDemoSongs(playlistId) {
  if (!isFeatureEnabled()) return 0;
  if (playlistId) {
    return getDatabase()
      .prepare('SELECT COUNT(*) AS count FROM suno_demo_songs WHERE playlist_id = ?')
      .get(playlistId).count;
  }
  return getDatabase().prepare('SELECT COUNT(*) AS count FROM suno_demo_songs').get().count;
}

function getRowBySongId(songId) {
  const rowId = SUNO_DEMO_SONG_ID_BASE - songId;
  if (rowId <= 0) return null;
  return getDatabase().prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(rowId);
}

function rowToSongRow(row) {
  const songId = songIdFromRowId(row.id);
  const playlistId = row.playlist_id ?? ensureDefaultSunoDemoPlaylistId();
  return {
    id: songId,
    artist_id: sunoPlaylistArtistId(playlistId),
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
    added_at: row.added_at ?? null,
  };
}

function listSunoDemoSongs(playlistId) {
  if (!isFeatureEnabled()) return [];
  ensureSunoDemoLibraryReady();
  if (!playlistId) return [];

  const rows = getDatabase()
    .prepare('SELECT * FROM suno_demo_songs WHERE playlist_id = ? ORDER BY added_at DESC')
    .all(playlistId);
  return rows.map(rowToSongRow);
}

function sunoDemoPageUrl(songId) {
  return `songpages-suno-demo:page/${songId}`;
}

/** Custom-playlist snapshots keyed by clip UUID — self-contained, not sidebar song ids. */
function findSunoSnapshotForClipUuid(clipUuid) {
  return (
    getDatabase()
      .prepare(
        `SELECT id, title, artist_name, cover_url, playback_url, external_id, page_url, lyrics,
                year, caption, provider_metadata_json, snapshot_refreshed_at, added_at
         FROM user_playlist_songs
         WHERE lower(external_id) = lower(?)
         ORDER BY added_at DESC
         LIMIT 1`,
      )
      .get(clipUuid) ?? null
  );
}

function snapshotRefreshTimestamp(snapshot) {
  return snapshot?.snapshot_refreshed_at ?? snapshot?.added_at ?? null;
}

/**
 * Snapshots written before videoCoverUrl existed omit the key entirely.
 * Treat those as stale so Studio is refetched and VC Video Cover can resolve.
 * (`null` means "checked, no cover" and is considered complete.)
 */
function providerMetadataHasVideoCoverField(providerMetadataJson) {
  const raw = String(providerMetadataJson ?? '').trim();
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return (
      parsed != null &&
      typeof parsed === 'object' &&
      Object.prototype.hasOwnProperty.call(parsed, 'videoCoverUrl')
    );
  } catch {
    return false;
  }
}

function sunoSnapshotIsFresh(snapshot) {
  return (
    Boolean(String(snapshot?.lyrics ?? '').trim()) &&
    Boolean(String(snapshot?.year ?? '').trim()) &&
    Boolean(String(snapshot?.provider_metadata_json ?? '').trim()) &&
    providerMetadataHasVideoCoverField(snapshot?.provider_metadata_json) &&
    !isStoredTimestampOlderThan(snapshotRefreshTimestamp(snapshot), SUNO_SNAPSHOT_REFRESH_MS)
  );
}

function sunoDemoRowIsFresh(row) {
  return (
    Boolean(String(row?.lyrics ?? '').trim()) &&
    !isStoredTimestampOlderThan(row?.metadata_refreshed_at ?? row?.added_at, SUNO_SNAPSHOT_REFRESH_MS)
  );
}

/** Push refetched Suno clip metadata into every custom-playlist snapshot for this clip. */
function applyClipToSunoSnapshots(clipUuid, clip) {
  const normalized = String(clipUuid || clip?.id || '').trim().toLowerCase();
  if (!normalized || !clip) return;

  const title = String(clip.title || 'Untitled').trim() || 'Untitled';
  const artistName = String(artistFromClip(clip) || 'Suno').trim() || 'Suno';
  const coverUrl = coverFromClip(clip, normalized);
  const playbackUrl = playbackFromClip(clip, normalized);
  const lyrics = lyricsFromClip(clip);
  const providerMetadata = metadataFromSunoClip(clip);
  const year = yearFromClip(clip) || providerMetadata.year;
  const caption = providerMetadata.tags || null;
  const providerMetadataJson = serializeSunoProviderMetadata(providerMetadata);
  const durationSeconds =
    typeof clip.metadata?.duration === 'number' && clip.metadata.duration > 0
      ? Math.round(clip.metadata.duration)
      : null;

  getDatabase()
    .prepare(
      `UPDATE user_playlist_songs SET
         title = ?, artist_name = ?, cover_url = ?, playback_url = ?, lyrics = ?,
         year = COALESCE(?, year),
         caption = ?,
         provider_metadata_json = ?,
         duration_seconds = COALESCE(?, duration_seconds),
         snapshot_refreshed_at = datetime('now')
       WHERE lower(external_id) = lower(?)`,
    )
    .run(
      title,
      artistName,
      coverUrl,
      playbackUrl,
      lyrics,
      year,
      caption,
      providerMetadataJson,
      durationSeconds,
      normalized,
    );
}

function refreshSunoDemoRowFromClip(row, clip) {
  if (!row || !clip) return row;

  const clipUuid = String(clip.id || row.clip_uuid || '').trim();
  const title = String(clip.title || row.title || 'Untitled').trim() || 'Untitled';
  const artistName = String(artistFromClip(clip) || row.artist_name || 'Suno').trim() || 'Suno';
  const coverUrl = coverFromClip(clip, clipUuid) || row.cover_url || null;
  const playbackUrl = playbackFromClip(clip, clipUuid) || row.playback_url || '';
  const lyrics = lyricsFromClip(clip) || String(row.lyrics ?? '').trim();
  const durationSeconds =
    typeof clip.metadata?.duration === 'number' && clip.metadata.duration > 0
      ? Math.round(clip.metadata.duration)
      : row.duration_seconds;

  getDatabase()
    .prepare(
      `UPDATE suno_demo_songs SET
         title = ?, artist_name = ?, cover_url = ?, playback_url = ?, lyrics = ?,
         duration_seconds = ?, metadata_refreshed_at = datetime('now')
       WHERE id = ?`,
    )
    .run(title, artistName, coverUrl, playbackUrl, lyrics, durationSeconds, row.id);

  return {
    ...row,
    title,
    artist_name: artistName,
    cover_url: coverUrl,
    playback_url: playbackUrl,
    lyrics,
    duration_seconds: durationSeconds,
  };
}

/** Legacy lookup for sidebar song-id pointers still being migrated. */
function findSunoSnapshotForSongId(songId) {
  const pageUrl = sunoDemoPageUrl(songId);
  const manifestUrl = sunoDemoManifestUrl(songId);
  return (
    getDatabase()
      .prepare(
        `SELECT title, artist_name, cover_url, playback_url, external_id, page_url
         FROM user_playlist_songs
         WHERE (page_url = ? OR song_manifest_url = ?)
           AND external_id IS NOT NULL AND trim(external_id) != ''
         ORDER BY added_at DESC
         LIMIT 1`,
      )
      .get(pageUrl, manifestUrl) ?? null
  );
}

function manifestFromSunoRow(row, songId) {
  // Prefer clip-UUID snapshot metadata when the sidebar row itself doesn't store Studio fields.
  const snapshot =
    findSunoSnapshotForClipUuid(row.clip_uuid) || findSunoSnapshotForSongId(songId);
  const providerMetadata = parseSunoProviderMetadata(snapshot?.provider_metadata_json);
  const year = String(snapshot?.year ?? providerMetadata?.year ?? '').trim();
  const caption = String(snapshot?.caption ?? providerMetadata?.tags ?? '').trim();
  const about = String(providerMetadata?.stylePrompt ?? '').trim();

  return {
    schemaVersion: 1,
    siteRoot: '',
    artistSlug: 'suno-playlist',
    artistName: row.artist_name || snapshot?.artist_name || 'Suno',
    id: row.clip_uuid,
    slug: row.clip_uuid,
    title: row.title,
    album: '',
    year,
    caption,
    about,
    lyrics: row.lyrics || snapshot?.lyrics || '',
    coverUrl: row.cover_url || snapshot?.cover_url || null,
    extraImageUrl: null,
    pageUrl: sunoDemoPageUrl(songId),
    playbackUrl: row.playback_url || snapshot?.playback_url || '',
    streamLinks: { youtube: '', spotify: '', soundcloud: '' },
    playbackScope: 'full',
    playbackQuality: 'standard',
    buildVersion: 'suno-demo',
    durationSeconds: row.duration_seconds,
    providerMetadata: providerMetadata || null,
  };
}

function isLiveStudioClip(clip) {
  if (!clip || typeof clip !== 'object') return false;
  // Synthetic cache-hit stubs only carry id/title/prompt — treat those as non-live.
  return Boolean(
    clip.handle ||
      clip.user_handle ||
      clip.created_at ||
      clip.createdAt ||
      clip.major_model_version ||
      clip.majorModelVersion ||
      clip.avatar_image_url ||
      clip.play_count != null ||
      clip.upvote_count != null ||
      (clip.metadata && typeof clip.metadata === 'object' && (clip.metadata.tags || clip.metadata.prompt)),
  );
}

function resolveProviderMetadata(clip, snapshot) {
  // Prefer a real Studio payload; otherwise keep the richer snapshot we already stored.
  // Cache-hit stubs must not wipe creator handle / model badge / play counts.
  if (isLiveStudioClip(clip)) {
    return metadataFromSunoClip(clip);
  }
  return parseSunoProviderMetadata(snapshot?.provider_metadata_json);
}

function manifestFromSunoClip(clip, songId, snapshot) {
  const liveClip = clip && typeof clip === 'object' ? clip : null;
  const clipUuid = String(liveClip?.id || snapshot?.external_id || '').trim();
  const title =
    String(liveClip?.title || snapshot?.title || 'Untitled').trim() || 'Untitled';
  const artistName =
    String(
      (liveClip ? artistFromClip(liveClip) : '') || snapshot?.artist_name || 'Suno',
    ).trim() || 'Suno';
  const lyrics = String(snapshot?.lyrics || '').trim() || lyricsFromClip(liveClip);
  const providerMetadata = resolveProviderMetadata(liveClip, snapshot);
  const year =
    yearFromClip(liveClip) ||
    providerMetadata?.year ||
    String(snapshot?.year ?? '').trim() ||
    '';
  const tags =
    providerMetadata?.tags ||
    String(snapshot?.caption ?? '').trim() ||
    '';
  const stylePrompt = providerMetadata?.stylePrompt || '';
  const durationSeconds =
    typeof liveClip?.metadata?.duration === 'number' && liveClip.metadata.duration > 0
      ? Math.round(liveClip.metadata.duration)
      : null;
  const pageUrl =
    songId != null ? sunoDemoPageUrl(songId) : sunoDemoPageUrlFromClipUuid(clipUuid);

  return {
    schemaVersion: 1,
    siteRoot: '',
    artistSlug: 'suno-playlist',
    artistName,
    id: clipUuid,
    slug: clipUuid,
    title,
    album: '',
    year,
    caption: tags,
    // Style inspiration prompt — separate from lyrics (Flow uses `about` similarly).
    about: stylePrompt,
    lyrics,
    coverUrl: resolveSunoCoverUrl(liveClip, clipUuid, snapshot?.cover_url),
    extraImageUrl: null,
    pageUrl,
    playbackUrl:
      (liveClip ? playbackFromClip(liveClip, clipUuid) : '') || snapshot?.playback_url || '',
    streamLinks: { youtube: '', spotify: '', soundcloud: '' },
    playbackScope: 'full',
    playbackQuality: 'standard',
    buildVersion: 'suno-demo',
    durationSeconds,
    providerMetadata: providerMetadata || null,
  };
}

/** Re-insert a missing canonical row so future manifest lookups succeed without refetch. */
function healMissingSunoDemoRow(songId, clip, snapshot, lyrics) {
  const rowId = rowIdFromSongId(songId);
  if (rowId <= 0) return null;

  const db = getDatabase();
  if (db.prepare('SELECT id FROM suno_demo_songs WHERE id = ?').get(rowId)) return null;

  const clipUuid = String(clip.id || snapshot?.external_id || '').trim();
  if (!clipUuid) return null;

  const existingByClip = db.prepare('SELECT id FROM suno_demo_songs WHERE clip_uuid = ?').get(clipUuid);
  if (existingByClip) return db.prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(existingByClip.id);

  const title = String(clip.title || snapshot?.title || 'Untitled').trim() || 'Untitled';
  const artistName = String(artistFromClip(clip) || snapshot?.artist_name || 'Suno').trim() || 'Suno';
  const coverUrl = coverFromClip(clip, clipUuid) || snapshot?.cover_url || null;
  const playbackUrl = playbackFromClip(clip, clipUuid) || snapshot?.playback_url || '';
  const durationSeconds =
    typeof clip.metadata?.duration === 'number' && clip.metadata.duration > 0
      ? Math.round(clip.metadata.duration)
      : null;
  const sourceUrl = `https://suno.com/song/${clipUuid}`;

  db.prepare(
    `INSERT INTO suno_demo_songs (
       id, clip_uuid, title, artist_name, cover_url, playback_url, lyrics, source_url, duration_seconds, playlist_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    rowId,
    clipUuid,
    title,
    artistName,
    coverUrl,
    playbackUrl,
    lyrics,
    sourceUrl,
    durationSeconds,
    ensureDefaultSunoDemoPlaylistId(),
  );

  return db.prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(rowId);
}

function refreshSunoDemoLyrics(row, lyrics) {
  const trimmed = String(lyrics ?? '').trim();
  if (!trimmed || !row) return row;
  if (String(row.lyrics ?? '').trim()) return row;

  getDatabase()
    .prepare(
      `UPDATE suno_demo_songs SET lyrics = ?, metadata_refreshed_at = datetime('now') WHERE id = ?`,
    )
    .run(trimmed, row.id);

  return { ...row, lyrics: trimmed };
}

/**
 * Resolve a Suno manifest — refetching from Suno when the DB row is missing, lyrics are empty,
 * or cached metadata is older than the Suno snapshot refresh window (7 days).
 */
async function buildManifestForSongIdAsync(songId) {
  if (!isFeatureEnabled()) return null;

  let row = getRowBySongId(songId);
  if (row && sunoDemoRowIsFresh(row)) {
    return manifestFromSunoRow(row, songId);
  }

  const snapshot = findSunoSnapshotForSongId(songId);
  const clipUuid = String(row?.clip_uuid || snapshot?.external_id || '').trim();
  if (!clipUuid) {
    return row ? manifestFromSunoRow(row, songId) : null;
  }

  let clip;
  try {
    clip = await fetchStudioClip(clipUuid);
  } catch {
    return row ? manifestFromSunoRow(row, songId) : null;
  }

  const lyrics = lyricsFromClip(clip);
  applyClipToSunoSnapshots(clipUuid, clip);

  if (row) {
    row = refreshSunoDemoRowFromClip(row, clip);
    return manifestFromSunoRow(row, songId);
  }

  row = healMissingSunoDemoRow(songId, clip, snapshot, lyrics);
  if (row) {
    return manifestFromSunoRow(row, songId);
  }

  return manifestFromSunoClip(clip, songId, snapshot);
}

/**
 * Resolve a Suno manifest for a custom-playlist clip UUID snapshot.
 * Refetches from Suno when lyrics are empty or the snapshot is older than 7 days.
 */
async function buildManifestForClipUuidAsync(clipUuid) {
  if (!isFeatureEnabled()) return null;

  const normalized = String(clipUuid || '').trim().toLowerCase();
  if (!normalized) return null;

  const snapshot = findSunoSnapshotForClipUuid(normalized);
  if (snapshot && sunoSnapshotIsFresh(snapshot)) {
    // Pass null clip so we keep snapshot providerMetadata instead of a thin stub.
    return manifestFromSunoClip(null, null, snapshot);
  }

  const row = getDatabase()
    .prepare('SELECT * FROM suno_demo_songs WHERE lower(clip_uuid) = lower(?)')
    .get(normalized);

  if (row && sunoDemoRowIsFresh(row)) {
    if (snapshot && !snapshot.lyrics?.trim()) {
      getDatabase()
        .prepare(
          `UPDATE user_playlist_songs SET lyrics = ?, snapshot_refreshed_at = datetime('now') WHERE id = ?`,
        )
        .run(row.lyrics, snapshot.id);
    }
    return manifestFromSunoRow(row, songIdFromRowId(row.id));
  }

  let clip;
  try {
    clip = await fetchStudioClip(normalized);
  } catch {
    if (row) return manifestFromSunoRow(row, songIdFromRowId(row.id));
    return snapshot
      ? manifestFromSunoClip({ id: normalized, title: snapshot.title }, null, snapshot)
      : null;
  }

  applyClipToSunoSnapshots(normalized, clip);

  if (row) {
    const refreshed = refreshSunoDemoRowFromClip(row, clip);
    return manifestFromSunoRow(refreshed, songIdFromRowId(row.id));
  }

  return manifestFromSunoClip(clip, null, snapshot);
}

function buildManifestForSongId(songId) {
  const row = getRowBySongId(songId);
  if (!row) return null;

  return manifestFromSunoRow(row, songId);
}

async function addSunoDemoSongByUrl(input, playlistId) {
  if (!isFeatureEnabled()) {
    return { ok: false, error: 'Suno demo feature is disabled.' };
  }

  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a Suno share URL or clip UUID.' };
  }

  const resolvedPlaylistId = playlistId ?? ensureDefaultSunoDemoPlaylistId();
  if (!resolvedPlaylistId || !getSunoDemoPlaylistById(resolvedPlaylistId)) {
    return { ok: false, error: 'Suno playlist not found.' };
  }

  const clipUuid = await resolveInputToSongId(trimmed);
  if (!clipUuid) {
    return { ok: false, error: 'Could not parse a Suno clip UUID from that input.' };
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM suno_demo_songs WHERE clip_uuid = ?').get(clipUuid);
  if (existing) {
    const song = rowToSongRow(db.prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(existing.id));
    return {
      ok: true,
      data: {
        song,
        duplicate: true,
        count: countSunoDemoSongs(resolvedPlaylistId),
      },
    };
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
         clip_uuid, title, artist_name, cover_url, playback_url, lyrics, source_url, duration_seconds, playlist_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      clipUuid,
      title,
      artistName,
      coverUrl,
      playbackUrl,
      lyrics,
      trimmed,
      durationSeconds,
      resolvedPlaylistId,
    );

  const row = db.prepare('SELECT * FROM suno_demo_songs WHERE id = ?').get(insert.lastInsertRowid);
  const song = rowToSongRow(row);

  return {
    ok: true,
    data: { song, duplicate: false, count: countSunoDemoSongs(resolvedPlaylistId) },
  };
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
  const playlistId = row.playlist_id;
  getDatabase().prepare('DELETE FROM suno_demo_songs WHERE id = ?').run(row.id);
  return { count: countSunoDemoSongs(playlistId) };
}

module.exports = {
  initSunoDemoSchema,
  countSunoDemoSongs,
  listSunoDemoSongs,
  addSunoDemoSongByUrl,
  buildManifestForSongId,
  buildManifestForSongIdAsync,
  buildManifestForClipUuidAsync,
  findSunoSnapshotForSongId,
  findSunoSnapshotForClipUuid,
  getRowBySongId,
  updateSunoDemoSongDuration,
  removeSunoDemoSong,
};
