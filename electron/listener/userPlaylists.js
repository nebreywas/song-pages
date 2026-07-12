/**
 * Custom user playlists — sidebar ids at -10001 and below.
 *
 * Playlist rows are self-contained snapshots. Add/move copies the full stored row
 * at write time (1:1) — never pointers into Suno sidebar tables, other custom
 * playlists, or subscribed catalog rows. Reads never join external playlists.
 */
const { getDatabase } = require('../database');

const USER_PLAYLIST_ARTIST_ID_BASE = -10_000;
const USER_PLAYLIST_SONG_ID_BASE = -3_000_000;

/** Bump when snapshot repair logic changes — triggers one-time repair pass. */
const USER_PLAYLIST_SNAPSHOT_REPAIR_VERSION = 2;
const USER_PLAYLIST_SNAPSHOT_REPAIR_KEY = 'user_playlist_snapshot_repair_version';

function isNonemptyString(value) {
  return Boolean(String(value ?? '').trim());
}

function isBlankSnapshotValue(value) {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  return false;
}

/** Fill missing snapshot fields from a repair source; replace when stored value is blank. */
function mergeSnapshotFieldsFillMissing(stored, incoming) {
  const merged = { ...stored };
  for (const key of Object.keys(incoming)) {
    if (isBlankSnapshotValue(merged[key]) && !isBlankSnapshotValue(incoming[key])) {
      merged[key] = incoming[key];
    }
  }
  return merged;
}

function isCompleteProviderSnapshot(pageUrl, fields, isSnapshot) {
  return (
    isSnapshot(pageUrl) &&
    isNonemptyString(fields.external_id) &&
    isNonemptyString(fields.page_url) &&
    isNonemptyString(fields.playback_url) &&
    isNonemptyString(fields.song_manifest_url)
  );
}

function userPlaylistArtistId(playlistId) {
  return USER_PLAYLIST_ARTIST_ID_BASE - playlistId;
}

function userPlaylistIdFromArtistId(artistId) {
  if (typeof artistId !== 'number' || artistId > USER_PLAYLIST_ARTIST_ID_BASE - 1) return null;
  return USER_PLAYLIST_ARTIST_ID_BASE - artistId;
}

function isUserPlaylistArtistId(artistId) {
  return typeof artistId === 'number' && artistId <= USER_PLAYLIST_ARTIST_ID_BASE - 1;
}

const { isSunoDemoSongId } = require('./sunoDemo/feature');
const { resolveRemoteUrl } = require('./cache/urls');
const {
  findLibrarySongIdByPageUrl,
  pageUrlResourceIdentity,
  resolveCatalogSourceArtistId,
} = require('./librarySongLookup');

function isAbsoluteUrl(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(String(value || '').trim());
}

function absolutizeSongUrl(reference, ...bases) {
  const trimmed = String(reference || '').trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  for (const base of bases) {
    if (!base) continue;
    const resolved = resolveRemoteUrl(base, trimmed);
    if (resolved) return resolved;
  }
  return trimmed;
}

/** Resolve manifest-relative asset paths to absolute URLs for storage. */
function normalizeSongSnapshotFields(fields, siteRoot) {
  const pageUrl = absolutizeSongUrl(fields.page_url, siteRoot) || fields.page_url;
  const manifestUrl =
    absolutizeSongUrl(fields.song_manifest_url, siteRoot, pageUrl) || fields.song_manifest_url;
  const playbackUrl =
    absolutizeSongUrl(fields.playback_url, siteRoot, pageUrl) || fields.playback_url;
  const manifestBase = manifestUrl || pageUrl;
  const coverUrl = fields.cover_url
    ? absolutizeSongUrl(fields.cover_url, manifestBase, pageUrl, siteRoot) || fields.cover_url
    : fields.cover_url;

  return {
    ...fields,
    page_url: pageUrl,
    playback_url: playbackUrl,
    song_manifest_url: manifestUrl,
    cover_url: coverUrl,
    site_root_normalized: fields.site_root_normalized ?? siteRoot ?? null,
  };
}

function isSunoSnapshot(pageUrl) {
  return String(pageUrl || '').startsWith('songpages-suno-demo:');
}

const { isYoutubeSnapshot } = require('./youtube/youtubeFeature');
const { isFlowSnapshot } = require('./flow/flowFeature');
const { isSoundcloudSnapshot } = require('./soundcloud/soundcloudFeature');

function isCompleteCatalogSnapshot(fields) {
  if (isSunoSnapshot(fields.page_url)) {
    const { parseSunoPageClipUuid } = require('./sunoDemo/feature');
    const clipUuid = parseSunoPageClipUuid(fields.page_url);
    if (clipUuid) {
      return Boolean(
        fields.song_manifest_url?.trim() &&
        fields.external_id?.trim() &&
        fields.playback_url?.trim(),
      );
    }
    return false;
  }
  if (isYoutubeSnapshot(fields.page_url)) {
    return isCompleteProviderSnapshot(fields.page_url, fields, isYoutubeSnapshot);
  }
  if (isFlowSnapshot(fields.page_url)) {
    return isCompleteProviderSnapshot(fields.page_url, fields, isFlowSnapshot);
  }
  if (isSoundcloudSnapshot(fields.page_url)) {
    return isCompleteProviderSnapshot(fields.page_url, fields, isSoundcloudSnapshot);
  }
  return Boolean(
    fields.cover_url?.trim() &&
    fields.song_manifest_url?.trim() &&
    fields.site_root_normalized?.trim() &&
    fields.page_url?.trim() &&
    fields.playback_url?.trim(),
  );
}

function snapshotFieldsFromDbRow(row) {
  return {
    library_song_id: row.library_song_id ?? null,
    source_artist_id: row.source_artist_id ?? null,
    artist_name: row.artist_name,
    title: row.title,
    album: row.album,
    year: row.year,
    caption: row.caption,
    cover_url: row.cover_url,
    page_url: row.page_url,
    playback_url: row.playback_url,
    song_manifest_url: row.song_manifest_url,
    playback_scope: row.playback_scope,
    playback_quality: row.playback_quality,
    external_id: row.external_id,
    duration_seconds: row.duration_seconds,
    site_root_normalized: row.site_root_normalized ?? null,
    lyrics: row.lyrics ?? '',
    snapshot_refreshed_at: row.snapshot_refreshed_at ?? row.added_at ?? null,
  };
}

function readStoredPlaylistEntry(song) {
  if (song?.user_playlist_entry_id) {
    return getDatabase()
      .prepare('SELECT * FROM user_playlist_songs WHERE id = ?')
      .get(song.user_playlist_entry_id);
  }
  if (typeof song?.id === 'number' && song.id <= USER_PLAYLIST_SONG_ID_BASE) {
    return getEntryBySongId(song.id);
  }
  return null;
}

function migratePlaylistSongColumns(db) {
  const cols = db.prepare('PRAGMA table_info(user_playlist_songs)').all().map((col) => col.name);
  if (!cols.includes('site_root_normalized')) {
    db.exec('ALTER TABLE user_playlist_songs ADD COLUMN site_root_normalized TEXT');
  }
  if (!cols.includes('lyrics')) {
    db.exec('ALTER TABLE user_playlist_songs ADD COLUMN lyrics TEXT NOT NULL DEFAULT ""');
  }
  if (!cols.includes('snapshot_refreshed_at')) {
    db.exec('ALTER TABLE user_playlist_songs ADD COLUMN snapshot_refreshed_at TEXT');
    db.exec(
      `UPDATE user_playlist_songs SET snapshot_refreshed_at = COALESCE(added_at, datetime('now'))
       WHERE snapshot_refreshed_at IS NULL`,
    );
  }
  repairSunoPlaylistSnapshotPointers(db);
  repairLegacySunoCoverSnapshots(db);
}

/** Force manifest refetch for snapshots still pointing at legacy cdn1 cover URLs (403 on many clips). */
function repairLegacySunoCoverSnapshots(db) {
  db.prepare(
    `UPDATE user_playlist_songs
     SET snapshot_refreshed_at = NULL
     WHERE page_url LIKE 'songpages-suno-demo:%'
       AND cover_url LIKE '%cdn1.suno.ai%'`,
  ).run();
}

/** Rewrite legacy Suno sidebar song-id pointers into self-contained clip-UUID snapshots. */
function repairSunoPlaylistSnapshotPointers(db) {
  const {
    sunoDemoPageUrlFromClipUuid,
    sunoDemoManifestUrlFromClipUuid,
    parseSunoPageClipUuid,
  } = require('./sunoDemo/feature');
  const { getRowBySongId } = require('./sunoDemo/sunoDemoSongs');

  const rows = db
    .prepare(`SELECT * FROM user_playlist_songs WHERE page_url LIKE 'songpages-suno-demo:page/%'`)
    .all();
  const update = db.prepare(
    `UPDATE user_playlist_songs
     SET page_url = ?, song_manifest_url = ?, external_id = ?, lyrics = ?,
         cover_url = COALESCE(?, cover_url),
         playback_url = COALESCE(?, playback_url)
     WHERE id = ?`,
  );

  for (const row of rows) {
    if (parseSunoPageClipUuid(row.page_url)) continue;

    const sunoSongId = sunoSongIdFromPageUrl(row.page_url);
    let clipUuid = String(row.external_id || '').trim().toLowerCase();
    let lyrics = String(row.lyrics || '').trim();
    let coverUrl = null;
    let playbackUrl = null;
    let sunoRow = null;

    if (sunoSongId != null) {
      sunoRow = getRowBySongId(sunoSongId);
      clipUuid = clipUuid || String(sunoRow?.clip_uuid || '').trim().toLowerCase() || null;
      if (!lyrics && sunoRow?.lyrics?.trim()) lyrics = sunoRow.lyrics.trim();
      coverUrl = sunoRow?.cover_url?.trim() || null;
      playbackUrl = sunoRow?.playback_url?.trim() || null;
    }

    if (!clipUuid) continue;

    update.run(
      sunoDemoPageUrlFromClipUuid(clipUuid),
      sunoDemoManifestUrlFromClipUuid(clipUuid),
      clipUuid,
      lyrics,
      coverUrl,
      playbackUrl,
      row.id,
    );
  }
}

function captureSongFields(song) {
  if (!song || !song.title || !song.page_url || !song.playback_url) {
    throw new Error('Song metadata is incomplete.');
  }

  const librarySongId =
    typeof song.library_song_id === 'number' && song.library_song_id > 0
      ? song.library_song_id
      : typeof song.id === 'number' && song.id > 0
        ? song.id
        : null;

  return {
    library_song_id: librarySongId,
    source_artist_id: resolveCatalogSourceArtistId(song),
    artist_name: String(song.artist_name ?? 'Unknown').trim() || 'Unknown',
    title: String(song.title).trim(),
    album: song.album ?? null,
    year: song.year ?? null,
    caption: song.caption ?? null,
    cover_url: song.cover_url ?? null,
    page_url: String(song.page_url).trim(),
    playback_url: String(song.playback_url).trim(),
    song_manifest_url: song.song_manifest_url ?? null,
    playback_scope: song.playback_scope ?? null,
    playback_quality: song.playback_quality ?? null,
    external_id: song.external_id ?? null,
    duration_seconds: song.duration_seconds ?? null,
    site_root_normalized: song.site_root_normalized ?? null,
    lyrics: song.lyrics ?? '',
    snapshot_refreshed_at: song.snapshot_refreshed_at ?? null,
  };
}

function enrichSongFromLibrary(fields) {
  if (!fields.library_song_id) return fields;
  const row = getDatabase()
    .prepare(
      `SELECT s.*, a.artist_name, a.site_root_normalized
       FROM songs s
       JOIN artists a ON a.id = s.artist_id
       WHERE s.id = ?`,
    )
    .get(fields.library_song_id);
  if (!row) return fields;
  return normalizeSongSnapshotFields(
    {
      ...fields,
      library_song_id: row.id,
      source_artist_id: row.artist_id,
      artist_name: row.artist_name,
      title: row.title,
      album: row.album,
      year: row.year,
      caption: row.caption,
      cover_url: row.cover_url,
      page_url: row.page_url,
      playback_url: row.playback_url,
      song_manifest_url: row.song_manifest_url,
      playback_scope: row.playback_scope,
      playback_quality: row.playback_quality,
      external_id: row.external_id,
      duration_seconds: row.duration_seconds,
      site_root_normalized: row.site_root_normalized,
    },
    row.site_root_normalized || null,
  );
}

function sunoSongIdFromPageUrl(pageUrl) {
  if (typeof pageUrl !== 'string' || !pageUrl.startsWith('songpages-suno-demo:page/')) return null;
  const id = Number(pageUrl.slice('songpages-suno-demo:page/'.length));
  return isSunoDemoSongId(id) ? id : null;
}

function enrichSongFromSuno(song) {
  const {
    sunoDemoPageUrlFromClipUuid,
    sunoDemoManifestUrlFromClipUuid,
    parseSunoPageClipUuid,
  } = require('./sunoDemo/feature');

  const existingClip = parseSunoPageClipUuid(song.page_url);
  if (existingClip) {
    // Self-contained snapshot — copy 1:1; never re-resolve through sidebar song ids.
    return {
      ...captureSongFields({
        ...song,
        page_url: sunoDemoPageUrlFromClipUuid(existingClip),
        song_manifest_url: sunoDemoManifestUrlFromClipUuid(existingClip),
        playback_scope: 'suno-demo',
        external_id: existingClip,
      }),
      lyrics: String(song.lyrics ?? '').trim(),
      snapshot_refreshed_at: song.snapshot_refreshed_at ?? null,
      site_root_normalized: '',
    };
  }

  const { getRowBySongId } = require('./sunoDemo/sunoDemoSongs');
  let clipUuid = String(song.external_id || '').trim().toLowerCase() || null;

  const sunoSongId = isSunoDemoSongId(song.id) ? song.id : sunoSongIdFromPageUrl(song.page_url);
  let row = null;
  if (sunoSongId != null) {
    row = getRowBySongId(sunoSongId);
    clipUuid = clipUuid || String(row?.clip_uuid || '').trim().toLowerCase() || null;
  }

  if (!clipUuid) return captureSongFields(song);

  return {
    ...captureSongFields({
      ...song,
      artist_name: row?.artist_name ?? song.artist_name,
      title: row?.title ?? song.title,
      page_url: sunoDemoPageUrlFromClipUuid(clipUuid),
      playback_url: row?.playback_url ?? song.playback_url,
      song_manifest_url: sunoDemoManifestUrlFromClipUuid(clipUuid),
      playback_scope: 'suno-demo',
      external_id: clipUuid,
      cover_url: row?.cover_url ?? song.cover_url,
      duration_seconds: row?.duration_seconds ?? song.duration_seconds,
      site_root_normalized: '',
    }),
    lyrics: String(row?.lyrics ?? song.lyrics ?? '').trim(),
    snapshot_refreshed_at: null,
    site_root_normalized: '',
  };
}

function enrichSongFromYoutubeFields(fields) {
  const {
    youtubeWatchUrl,
    youtubePageUrl,
    youtubeManifestUrl,
    youtubeThumbnailUrl,
    YOUTUBE_PLAYBACK_SCOPE,
  } = require('./youtube/youtubeFeature');
  const videoId = fields.external_id;
  if (!videoId) return fields;
  return {
    ...fields,
    artist_name: fields.artist_name || 'YouTube',
    title: fields.title || 'YouTube Video',
    page_url: youtubePageUrl(videoId),
    playback_url: youtubeWatchUrl(videoId),
    song_manifest_url: youtubeManifestUrl(videoId),
    playback_scope: YOUTUBE_PLAYBACK_SCOPE,
    cover_url: fields.cover_url || youtubeThumbnailUrl(videoId),
    external_id: videoId,
    site_root_normalized: '',
  };
}

function enrichSongFromFlowFields(fields) {
  const {
    flowPageUrl,
    flowManifestUrl,
    FLOW_PLAYBACK_SCOPE,
  } = require('./flow/flowFeature');
  const clipId = fields.external_id;
  if (!clipId) return fields;
  return {
    ...fields,
    artist_name: fields.artist_name || 'Google Flow',
    title: fields.title || 'Google Flow Song',
    page_url: flowPageUrl(clipId),
    playback_url: fields.playback_url || `https://storage.googleapis.com/producer-app-public/clips/${clipId}.m4a`,
    song_manifest_url: flowManifestUrl(clipId),
    playback_scope: FLOW_PLAYBACK_SCOPE,
    external_id: clipId,
    site_root_normalized: '',
  };
}

function enrichSongFromSoundcloudFields(fields) {
  const {
    soundcloudPageUrl,
    soundcloudManifestUrl,
    SOUNDCLOUD_PLAYBACK_SCOPE,
  } = require('./soundcloud/soundcloudFeature');
  const trackId = fields.external_id;
  if (!trackId) return fields;
  return {
    ...fields,
    artist_name: fields.artist_name || 'SoundCloud',
    title: fields.title || 'SoundCloud Track',
    page_url: soundcloudPageUrl(trackId),
    playback_url: fields.playback_url || '',
    song_manifest_url: soundcloudManifestUrl(trackId),
    playback_scope: SOUNDCLOUD_PLAYBACK_SCOPE,
    external_id: trackId,
    site_root_normalized: '',
  };
}

/**
 * Build the full row payload stored on a playlist — called only on add/move/repair.
 * Playlist-to-playlist copies carry the stored snapshot forward without re-querying catalog.
 */
function materializePlaylistSnapshot(song, options = {}) {
  const { carryForward = true } = options;

  if (carryForward) {
    const storedEntry = readStoredPlaylistEntry(song);
    if (storedEntry) {
      return snapshotFieldsFromDbRow(storedEntry);
    }
  }

  let fields = captureSongFields(song);

  if (isYoutubeSnapshot(fields.page_url) || fields.playback_scope === 'youtube') {
    return enrichSongFromYoutubeFields(fields);
  }

  if (isFlowSnapshot(fields.page_url) || fields.playback_scope === 'flow') {
    return enrichSongFromFlowFields(fields);
  }

  if (isSoundcloudSnapshot(fields.page_url) || fields.playback_scope === 'soundcloud') {
    return enrichSongFromSoundcloudFields(fields);
  }

  if (isSunoDemoSongId(song.id) || isSunoSnapshot(fields.page_url)) {
    return enrichSongFromSuno(song);
  }

  if (isCompleteCatalogSnapshot(fields)) {
    return normalizeSongSnapshotFields(fields, fields.site_root_normalized);
  }

  if (!fields.library_song_id && fields.page_url) {
    const matched = findLibrarySongIdByPageUrl(fields.page_url);
    if (matched) fields.library_song_id = matched;
  }

  if (fields.library_song_id) {
    return enrichSongFromLibrary(fields);
  }

  if (typeof song.id === 'number' && song.id < 0 && song.liked_id) {
    const liked = getDatabase().prepare('SELECT * FROM liked_songs WHERE id = ?').get(song.liked_id);
    if (liked) {
      fields = captureSongFields({
        ...song,
        artist_name: liked.artist_name,
        title: liked.title,
        page_url: liked.page_url,
        playback_url: liked.playback_url,
        external_id: liked.external_id,
      });
    }
  }

  let siteRoot = fields.site_root_normalized;
  const sourceArtistId =
    fields.source_artist_id > 0 ? fields.source_artist_id : resolveCatalogSourceArtistId(song);
  if (!siteRoot && sourceArtistId) {
    const artist = getDatabase()
      .prepare('SELECT site_root_normalized FROM artists WHERE id = ?')
      .get(sourceArtistId);
    siteRoot = artist?.site_root_normalized ?? null;
    fields.source_artist_id = sourceArtistId;
  }

  return normalizeSongSnapshotFields(fields, siteRoot);
}

function repairUserPlaylistSnapshots(db) {
  const rows = db.prepare('SELECT * FROM user_playlist_songs').all();
  const update = db.prepare(
    `UPDATE user_playlist_songs SET
       library_song_id = ?, source_artist_id = ?, artist_name = ?, title = ?, album = ?, year = ?,
       caption = ?, cover_url = ?, page_url = ?, playback_url = ?, song_manifest_url = ?,
       playback_scope = ?, playback_quality = ?, external_id = ?, duration_seconds = ?,
       site_root_normalized = ?, lyrics = ?, snapshot_refreshed_at = ?
     WHERE id = ?`,
  );

  for (const row of rows) {
    const current = snapshotFieldsFromDbRow(row);
    if (isCompleteCatalogSnapshot(current)) continue;

    const repaired = materializePlaylistSnapshot(
      {
        ...current,
        id: songIdFromEntryId(row.id),
        user_playlist_entry_id: row.id,
        liked_id: null,
      },
      { carryForward: false },
    );

    const fields = mergeSnapshotFieldsFillMissing(current, repaired);

    update.run(
      fields.library_song_id,
      fields.source_artist_id,
      fields.artist_name,
      fields.title,
      fields.album,
      fields.year,
      fields.caption,
      fields.cover_url,
      fields.page_url,
      fields.playback_url,
      fields.song_manifest_url,
      fields.playback_scope,
      fields.playback_quality,
      fields.external_id,
      fields.duration_seconds,
      fields.site_root_normalized,
      fields.lyrics ?? '',
      fields.snapshot_refreshed_at ?? null,
      row.id,
    );
  }
}

function runRepairUserPlaylistSnapshotsIfNeeded(db) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(USER_PLAYLIST_SNAPSHOT_REPAIR_KEY);
  const currentVersion = Number(row?.value ?? 0);
  if (currentVersion >= USER_PLAYLIST_SNAPSHOT_REPAIR_VERSION) return;

  repairUserPlaylistSnapshots(db);
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(USER_PLAYLIST_SNAPSHOT_REPAIR_KEY, String(USER_PLAYLIST_SNAPSHOT_REPAIR_VERSION));
}

function initUserPlaylistsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_playlists (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_playlist_songs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id       INTEGER NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
      library_song_id   INTEGER,
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

    CREATE INDEX IF NOT EXISTS idx_user_playlist_songs_playlist ON user_playlist_songs(playlist_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlist_songs_library
      ON user_playlist_songs(playlist_id, library_song_id)
      WHERE library_song_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlist_songs_page
      ON user_playlist_songs(playlist_id, page_url)
      WHERE library_song_id IS NULL;
  `);

  migratePlaylistSongColumns(db);
  runRepairUserPlaylistSnapshotsIfNeeded(db);
}

function listUserPlaylists() {
  return getDatabase()
    .prepare(
      `SELECT p.id, p.name, p.created_at,
              (SELECT COUNT(*) FROM user_playlist_songs s WHERE s.playlist_id = p.id) AS song_count
       FROM user_playlists p
       ORDER BY p.id ASC`,
    )
    .all();
}

function getUserPlaylistById(playlistId) {
  return getDatabase()
    .prepare(
      `SELECT p.id, p.name, p.created_at,
              (SELECT COUNT(*) FROM user_playlist_songs s WHERE s.playlist_id = p.id) AS song_count
       FROM user_playlists p
       WHERE p.id = ?`,
    )
    .get(playlistId);
}

function nextUserPlaylistName(db) {
  const rows = db.prepare(`SELECT name FROM user_playlists WHERE name LIKE 'Custom %'`).all();
  let max = 0;
  for (const row of rows) {
    const match = /^Custom\s+(\d+)$/i.exec(String(row.name ?? '').trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Custom ${max + 1}`;
}

function createUserPlaylist(name) {
  const db = getDatabase();
  const resolvedName = String(name ?? '').trim() || nextUserPlaylistName(db);
  const insert = db.prepare('INSERT INTO user_playlists (name) VALUES (?)').run(resolvedName);
  const playlist = getUserPlaylistById(insert.lastInsertRowid);
  return {
    ok: true,
    data: { ...playlist, artist_id: userPlaylistArtistId(playlist.id) },
  };
}

function renameUserPlaylist(playlistId, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { ok: false, error: 'Playlist name cannot be empty.' };
  const db = getDatabase();
  const existing = getUserPlaylistById(playlistId);
  if (!existing) return { ok: false, error: 'Playlist not found.' };
  db.prepare('UPDATE user_playlists SET name = ? WHERE id = ?').run(trimmed, playlistId);
  const playlist = getUserPlaylistById(playlistId);
  return { ok: true, data: { ...playlist, artist_id: userPlaylistArtistId(playlist.id) } };
}

function removeUserPlaylist(playlistId) {
  const playlist = getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };
  getDatabase().prepare('DELETE FROM user_playlists WHERE id = ?').run(playlistId);
  const { clearCustomOrder } = require('./playlistOrder');
  clearCustomOrder(`user:${playlistId}`);
  return {
    ok: true,
    data: {
      artist_id: userPlaylistArtistId(playlistId),
      name: playlist.name,
      song_count: playlist.song_count,
    },
  };
}

function entryIdFromSongId(songId) {
  return USER_PLAYLIST_SONG_ID_BASE - songId;
}

function songIdFromEntryId(entryId) {
  return USER_PLAYLIST_SONG_ID_BASE - entryId;
}

function getEntryBySongId(songId) {
  const entryId = entryIdFromSongId(songId);
  if (entryId <= 0) return null;
  return getDatabase().prepare('SELECT * FROM user_playlist_songs WHERE id = ?').get(entryId);
}

/** Persist runtime duration on a custom playlist snapshot row. */
function updateUserPlaylistSongDuration(songId, durationSeconds) {
  const entryId = entryIdFromSongId(songId);
  if (entryId <= 0) return false;

  const rounded = Math.round(durationSeconds);
  if (!Number.isFinite(rounded) || rounded <= 0) return false;

  const result = getDatabase()
    .prepare(
      `UPDATE user_playlist_songs SET duration_seconds = ?
       WHERE id = ? AND (duration_seconds IS NULL OR duration_seconds <= 0)`,
    )
    .run(rounded, entryId);

  return result.changes > 0;
}

function isUserPlaylistSongId(songId) {
  return typeof songId === 'number' && songId <= USER_PLAYLIST_SONG_ID_BASE;
}

function rowToSongRow(row, playlistArtistId) {
  const entrySongId = songIdFromEntryId(row.id);
  return {
    id: entrySongId,
    user_playlist_entry_id: row.id,
    artist_id: playlistArtistId,
    external_id: row.external_id ?? '',
    slug: row.external_id ?? '',
    title: row.title,
    album: row.album,
    year: row.year,
    caption: row.caption,
    cover_url: row.cover_url,
    page_url: row.page_url,
    playback_url: row.playback_url,
    song_manifest_url: row.song_manifest_url,
    playback_scope: row.playback_scope,
    playback_quality: row.playback_quality,
    duration_seconds: row.duration_seconds,
    sort_order: row.id,
    artist_name: row.artist_name,
    site_root_normalized: row.site_root_normalized ?? '',
    library_song_id: row.library_song_id ?? null,
    added_at: row.added_at ?? null,
  };
}

function getPlaylistSongRow(entryId, playlistId) {
  const row = getDatabase().prepare('SELECT * FROM user_playlist_songs WHERE id = ?').get(entryId);
  if (!row) return null;
  return rowToSongRow(row, userPlaylistArtistId(playlistId));
}

function listUserPlaylistSongs(playlistId) {
  const playlist = getUserPlaylistById(playlistId);
  if (!playlist) return [];
  const artistId = userPlaylistArtistId(playlistId);
  const rows = getDatabase()
    .prepare('SELECT * FROM user_playlist_songs WHERE playlist_id = ? ORDER BY added_at DESC')
    .all(playlistId);
  return rows.map((row) => rowToSongRow(row, artistId));
}

function findDuplicateEntryId(playlistId, fields) {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT id, page_url, library_song_id FROM user_playlist_songs WHERE playlist_id = ?')
    .all(playlistId);

  const pageIdentity = pageUrlResourceIdentity(fields.page_url);
  for (const row of rows) {
    if (fields.library_song_id && row.library_song_id === fields.library_song_id) {
      return row.id;
    }
    if (pageIdentity && pageUrlResourceIdentity(row.page_url) === pageIdentity) {
      return row.id;
    }
    if (row.page_url === fields.page_url) {
      return row.id;
    }
  }
  return null;
}

function insertSongFields(playlistId, fields) {
  const insert = getDatabase()
    .prepare(
      `INSERT INTO user_playlist_songs (
         playlist_id, library_song_id, source_artist_id, artist_name, title, album, year, caption,
         cover_url, page_url, playback_url, song_manifest_url, playback_scope, playback_quality,
         external_id, duration_seconds, site_root_normalized, lyrics, snapshot_refreshed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(
      playlistId,
      fields.library_song_id,
      fields.source_artist_id,
      fields.artist_name,
      fields.title,
      fields.album,
      fields.year,
      fields.caption,
      fields.cover_url,
      fields.page_url,
      fields.playback_url,
      fields.song_manifest_url,
      fields.playback_scope,
      fields.playback_quality,
      fields.external_id,
      fields.duration_seconds,
      fields.site_root_normalized,
      fields.lyrics ?? '',
    );

  const entryId = insert.lastInsertRowid;
  const { appendSongToUserPlaylistCustomOrder } = require('./playlistOrder');
  appendSongToUserPlaylistCustomOrder(playlistId, songIdFromEntryId(entryId));
  return entryId;
}

function addSongToUserPlaylist(playlistId, song) {
  const playlist = getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };

  const fields = materializePlaylistSnapshot(song);
  const duplicateEntryId = findDuplicateEntryId(playlistId, fields);
  if (duplicateEntryId) {
    return {
      ok: true,
      data: {
        duplicate: true,
        song: getPlaylistSongRow(duplicateEntryId, playlistId),
        count: getUserPlaylistById(playlistId).song_count,
      },
    };
  }

  const entryId = insertSongFields(playlistId, fields);
  return {
    ok: true,
    data: {
      duplicate: false,
      song: getPlaylistSongRow(entryId, playlistId),
      count: getUserPlaylistById(playlistId).song_count,
    },
  };
}

function removeUserPlaylistSong(songId) {
  const entry = getEntryBySongId(songId);
  if (!entry) return { count: 0 };
  const playlistId = entry.playlist_id;
  getDatabase().prepare('DELETE FROM user_playlist_songs WHERE id = ?').run(entry.id);

  const { removeSongFromUserPlaylistCustomOrder } = require('./playlistOrder');
  removeSongFromUserPlaylistCustomOrder(playlistId, songId);

  return { count: getUserPlaylistById(playlistId)?.song_count ?? 0, playlist_id: playlistId };
}

function removeSongFromUserPlaylistBySource(sourceArtistId, song) {
  const playlistId = userPlaylistIdFromArtistId(sourceArtistId);
  if (!playlistId) return false;

  const entry = getEntryBySongId(song.id);
  if (entry && entry.playlist_id === playlistId) {
    getDatabase().prepare('DELETE FROM user_playlist_songs WHERE id = ?').run(entry.id);
    return true;
  }

  const fields = materializePlaylistSnapshot(song);
  if (fields.library_song_id) {
    return (
      getDatabase()
        .prepare('DELETE FROM user_playlist_songs WHERE playlist_id = ? AND library_song_id = ?')
        .run(playlistId, fields.library_song_id).changes > 0
    );
  }
  const pageIdentity = pageUrlResourceIdentity(fields.page_url);
  if (pageIdentity) {
    const rows = getDatabase()
      .prepare('SELECT id, page_url FROM user_playlist_songs WHERE playlist_id = ?')
      .all(playlistId);
    for (const row of rows) {
      if (pageUrlResourceIdentity(row.page_url) === pageIdentity) {
        getDatabase().prepare('DELETE FROM user_playlist_songs WHERE id = ?').run(row.id);
        return true;
      }
    }
  }
  return (
    getDatabase()
      .prepare('DELETE FROM user_playlist_songs WHERE playlist_id = ? AND page_url = ?')
      .run(playlistId, fields.page_url).changes > 0
  );
}

function moveSongToUserPlaylist({ sourceArtistId, destPlaylistId, song }) {
  const sourcePlaylistId = userPlaylistIdFromArtistId(sourceArtistId);
  if (sourcePlaylistId === destPlaylistId) {
    return { ok: false, error: 'Song is already on that playlist.' };
  }

  const destFields = materializePlaylistSnapshot(song);
  if (findDuplicateEntryId(destPlaylistId, destFields)) {
    return { ok: false, error: 'Song is already on that playlist.' };
  }

  const sourceSongId = song.id;
  const db = getDatabase();
  const tx = db.transaction(() => {
    if (sourceArtistId === 0) {
      const likedSongs = require('./likedSongs');
      likedSongs.removeLikedSong({
        songId: song.id > 0 ? song.id : 0,
        likedId: song.liked_id ?? (song.id < 0 ? -song.id : null),
      });
    } else if (sourcePlaylistId) {
      removeSongFromUserPlaylistBySource(sourceArtistId, song);
    }

    return addSongToUserPlaylist(destPlaylistId, song);
  });

  const result = tx();
  if (!result.ok || result.data?.duplicate) {
    return result;
  }

  const {
    removeSongFromCustomOrderIfExists,
    removeSongFromUserPlaylistCustomOrder,
  } = require('./playlistOrder');

  if (sourcePlaylistId) {
    removeSongFromUserPlaylistCustomOrder(sourcePlaylistId, sourceSongId);
  } else if (sourceArtistId === 0) {
    removeSongFromCustomOrderIfExists('liked', sourceSongId);
  }

  return result;
}

module.exports = {
  initUserPlaylistsSchema,
  listUserPlaylists,
  getUserPlaylistById,
  createUserPlaylist,
  renameUserPlaylist,
  removeUserPlaylist,
  listUserPlaylistSongs,
  addSongToUserPlaylist,
  moveSongToUserPlaylist,
  removeUserPlaylistSong,
  getEntryBySongId,
  getPlaylistSongRow,
  findDuplicateEntryId,
  insertSongFields,
  updateUserPlaylistSongDuration,
  isUserPlaylistSongId,
  userPlaylistArtistId,
  userPlaylistIdFromArtistId,
  isUserPlaylistArtistId,
  USER_PLAYLIST_ARTIST_ID_BASE,
  materializePlaylistSnapshot,
  isCompleteCatalogSnapshot,
  mergeSnapshotFieldsFillMissing,
  repairUserPlaylistSnapshots,
  USER_PLAYLIST_SNAPSHOT_REPAIR_VERSION,
};
