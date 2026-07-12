/**
 * Custom user playlists — sidebar ids at -10001 and below.
 *
 * Playlist rows are self-contained snapshots. Add/move copies full song metadata
 * (URLs, cover, manifest, site root) at write time — reads never join the catalog.
 */
const { getDatabase } = require('../database');

const USER_PLAYLIST_ARTIST_ID_BASE = -10_000;
const USER_PLAYLIST_SONG_ID_BASE = -3_000_000;

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

function isCompleteCatalogSnapshot(fields) {
  if (isSunoSnapshot(fields.page_url)) return true;
  if (isYoutubeSnapshot(fields.page_url)) return true;
  return Boolean(
    fields.cover_url?.trim() &&
    fields.song_manifest_url?.trim() &&
    fields.site_root_normalized?.trim(),
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

function enrichSongFromSuno(song) {
  if (!isSunoDemoSongId(song.id)) return captureSongFields(song);
  const { getRowBySongId } = require('./sunoDemo/sunoDemoSongs');
  const { sunoDemoManifestUrl } = require('./sunoDemo/feature');
  const row = getRowBySongId(song.id);
  if (!row) return captureSongFields(song);
  return {
    ...captureSongFields({
      ...song,
      artist_name: row.artist_name,
      title: row.title,
      page_url: `songpages-suno-demo:page/${song.id}`,
      playback_url: row.playback_url,
      song_manifest_url: sunoDemoManifestUrl(song.id),
      playback_scope: 'suno-demo',
      external_id: row.clip_uuid,
      cover_url: row.cover_url,
      duration_seconds: row.duration_seconds,
      site_root_normalized: '',
    }),
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
  migratePlaylistSongColumns(db);
  const rows = db.prepare('SELECT * FROM user_playlist_songs').all();
  const update = db.prepare(
    `UPDATE user_playlist_songs SET
       library_song_id = ?, source_artist_id = ?, artist_name = ?, title = ?, album = ?, year = ?,
       caption = ?, cover_url = ?, page_url = ?, playback_url = ?, song_manifest_url = ?,
       playback_scope = ?, playback_quality = ?, external_id = ?, duration_seconds = ?,
       site_root_normalized = ?
     WHERE id = ?`,
  );

  for (const row of rows) {
    const current = snapshotFieldsFromDbRow(row);
    if (isCompleteCatalogSnapshot(current)) continue;

    const fields = materializePlaylistSnapshot(
      {
        ...current,
        id: songIdFromEntryId(row.id),
        user_playlist_entry_id: row.id,
        liked_id: null,
      },
      { carryForward: false },
    );

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
      row.id,
    );
  }
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
  repairUserPlaylistSnapshots(db);
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
         external_id, duration_seconds, site_root_normalized
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    );
  return insert.lastInsertRowid;
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

  return tx();
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
};
