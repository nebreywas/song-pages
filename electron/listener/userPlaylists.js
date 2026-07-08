/**
 * Custom user playlists — sidebar ids at -10001 and below.
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
      library_song_id   INTEGER REFERENCES songs(id) ON DELETE SET NULL,
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

function captureSongFields(song) {
  if (!song || !song.title || !song.page_url || !song.playback_url) {
    throw new Error('Song metadata is incomplete.');
  }

  const librarySongId = typeof song.id === 'number' && song.id > 0 ? song.id : null;

  return {
    library_song_id: librarySongId,
    source_artist_id: song.artist_id ?? song.source_artist_id ?? null,
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
  return {
    ...fields,
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
  };
}

function enrichSongFromSuno(song) {
  if (!isSunoDemoSongId(song.id)) return captureSongFields(song);
  const { getRowBySongId, buildManifestForSongId } = require('./sunoDemo/sunoDemoSongs');
  const row = getRowBySongId(song.id);
  if (!row) return captureSongFields(song);
  return captureSongFields({
    ...song,
    artist_name: row.artist_name,
    title: row.title,
    page_url: `songpages-suno-demo:page/${song.id}`,
    playback_url: row.playback_url,
    song_manifest_url: buildManifestForSongId ? require('./sunoDemo/feature').sunoDemoManifestUrl(song.id) : song.song_manifest_url,
    playback_scope: 'suno-demo',
    external_id: row.clip_uuid,
    cover_url: row.cover_url,
    duration_seconds: row.duration_seconds,
  });
}

function resolveSongFields(song) {
  let fields = captureSongFields(song);
  if (fields.library_song_id) {
    fields = enrichSongFromLibrary(fields);
  } else if (isSunoDemoSongId(song.id)) {
    fields = enrichSongFromSuno(song);
  } else if (typeof song.id === 'number' && song.id < 0 && song.liked_id) {
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
  return fields;
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
    site_root_normalized: '',
    library_song_id: row.library_song_id,
  };
}

function listUserPlaylistSongs(playlistId) {
  const playlist = getUserPlaylistById(playlistId);
  if (!playlist) return [];
  const artistId = userPlaylistArtistId(playlistId);
  const rows = getDatabase()
    .prepare(
      `SELECT ups.*,
              s.title AS live_title,
              s.album AS live_album,
              s.year AS live_year,
              s.caption AS live_caption,
              s.cover_url AS live_cover_url,
              s.page_url AS live_page_url,
              s.playback_url AS live_playback_url,
              s.song_manifest_url AS live_song_manifest_url,
              s.playback_scope AS live_playback_scope,
              s.playback_quality AS live_playback_quality,
              s.duration_seconds AS live_duration_seconds,
              s.external_id AS live_external_id,
              COALESCE(a.artist_name, ups.artist_name) AS live_artist_name,
              a.site_root_normalized AS live_site_root
       FROM user_playlist_songs ups
       LEFT JOIN songs s ON s.id = ups.library_song_id
       LEFT JOIN artists a ON a.id = COALESCE(s.artist_id, ups.source_artist_id)
       WHERE ups.playlist_id = ?
       ORDER BY ups.added_at DESC`,
    )
    .all(playlistId);

  return rows.map((row) => {
    const merged = {
      ...row,
      title: row.live_title ?? row.title,
      album: row.live_album ?? row.album,
      year: row.live_year ?? row.year,
      caption: row.live_caption ?? row.caption,
      cover_url: row.live_cover_url ?? row.cover_url,
      page_url: row.live_page_url ?? row.page_url,
      playback_url: row.live_playback_url ?? row.playback_url,
      song_manifest_url: row.live_song_manifest_url ?? row.song_manifest_url,
      playback_scope: row.live_playback_scope ?? row.playback_scope,
      playback_quality: row.live_playback_quality ?? row.playback_quality,
      duration_seconds: row.live_duration_seconds ?? row.duration_seconds,
      external_id: row.live_external_id ?? row.external_id,
      artist_name: row.live_artist_name ?? row.artist_name,
      site_root_normalized: row.live_site_root ?? '',
    };
    return rowToSongRow(merged, artistId);
  });
}

function findDuplicateEntryId(playlistId, fields) {
  const db = getDatabase();
  if (fields.library_song_id) {
    const row = db
      .prepare('SELECT id FROM user_playlist_songs WHERE playlist_id = ? AND library_song_id = ?')
      .get(playlistId, fields.library_song_id);
    return row?.id ?? null;
  }
  const row = db
    .prepare('SELECT id FROM user_playlist_songs WHERE playlist_id = ? AND page_url = ?')
    .get(playlistId, fields.page_url);
  return row?.id ?? null;
}

function insertSongFields(playlistId, fields) {
  const insert = getDatabase()
    .prepare(
      `INSERT INTO user_playlist_songs (
         playlist_id, library_song_id, source_artist_id, artist_name, title, album, year, caption,
         cover_url, page_url, playback_url, song_manifest_url, playback_scope, playback_quality,
         external_id, duration_seconds
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    );
  return insert.lastInsertRowid;
}

function addSongToUserPlaylist(playlistId, song) {
  const playlist = getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };

  const fields = resolveSongFields(song);
  const duplicateEntryId = findDuplicateEntryId(playlistId, fields);
  if (duplicateEntryId) {
    return {
      ok: true,
      data: {
        duplicate: true,
        song: rowToSongRow(
          getDatabase().prepare('SELECT * FROM user_playlist_songs WHERE id = ?').get(duplicateEntryId),
          userPlaylistArtistId(playlistId),
        ),
        count: getUserPlaylistById(playlistId).song_count,
      },
    };
  }

  const entryId = insertSongFields(playlistId, fields);
  const row = getDatabase().prepare('SELECT * FROM user_playlist_songs WHERE id = ?').get(entryId);
  return {
    ok: true,
    data: {
      duplicate: false,
      song: rowToSongRow(row, userPlaylistArtistId(playlistId)),
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

  const fields = resolveSongFields(song);
  if (fields.library_song_id) {
    return (
      getDatabase()
        .prepare('DELETE FROM user_playlist_songs WHERE playlist_id = ? AND library_song_id = ?')
        .run(playlistId, fields.library_song_id).changes > 0
    );
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
  userPlaylistArtistId,
  userPlaylistIdFromArtistId,
  isUserPlaylistArtistId,
  USER_PLAYLIST_ARTIST_ID_BASE,
};
