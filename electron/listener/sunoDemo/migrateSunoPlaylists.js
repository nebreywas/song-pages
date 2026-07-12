/**
 * One-time migration: Suno sidebar playlists → user Playlists with snapshot rows.
 */
const {
  isFeatureEnabled,
  sunoDemoPageUrlFromClipUuid,
  sunoDemoManifestUrlFromClipUuid,
  SUNO_DEMO_PLAYBACK_SCOPE,
  playbackFromClip,
  resolveSunoCoverUrl,
} = require('./feature');

const MIGRATION_KEY = 'suno_sidebar_playlists_migrated_v1';

function migrateSunoSidebarPlaylistsToUserPlaylists(db) {
  if (!isFeatureEnabled()) return;

  const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(MIGRATION_KEY);
  if (existing?.value === '1') return;

  const sunoPlaylists = db
    .prepare('SELECT id, name, created_at FROM suno_demo_playlists ORDER BY id ASC')
    .all();
  if (sunoPlaylists.length === 0) {
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(MIGRATION_KEY, '1');
    return;
  }

  const userPlaylists = require('../userPlaylists');
  const { clearCustomOrder } = require('../playlistOrder');

  const tx = db.transaction(() => {
    for (const sunoPlaylist of sunoPlaylists) {
      const insert = db
        .prepare('INSERT INTO user_playlists (name, created_at, updated_at) VALUES (?, ?, ?)')
        .run(sunoPlaylist.name, sunoPlaylist.created_at, sunoPlaylist.created_at);
      const userPlaylistId = insert.lastInsertRowid;

      const songs = db
        .prepare('SELECT * FROM suno_demo_songs WHERE playlist_id = ? ORDER BY added_at ASC')
        .all(sunoPlaylist.id);

      for (const row of songs) {
        const clipUuid = String(row.clip_uuid || '').trim();
        if (!clipUuid) continue;

        const pageUrl = sunoDemoPageUrlFromClipUuid(clipUuid);
        const duplicateEntryId = userPlaylists.findDuplicateEntryId(userPlaylistId, {
          page_url: pageUrl,
          external_id: clipUuid,
          library_song_id: null,
        });
        if (duplicateEntryId) continue;

        userPlaylists.insertSongFields(userPlaylistId, {
          library_song_id: null,
          source_artist_id: 0,
          artist_name: row.artist_name,
          title: row.title,
          album: null,
          year: null,
          caption: null,
          cover_url: row.cover_url || resolveSunoCoverUrl({ id: clipUuid }, clipUuid, null),
          page_url: pageUrl,
          playback_url: row.playback_url || playbackFromClip({ id: clipUuid }, clipUuid),
          song_manifest_url: sunoDemoManifestUrlFromClipUuid(clipUuid),
          playback_scope: SUNO_DEMO_PLAYBACK_SCOPE,
          playback_quality: 'standard',
          external_id: clipUuid,
          duration_seconds: row.duration_seconds,
          site_root_normalized: '',
          lyrics: row.lyrics || '',
        });
      }

      clearCustomOrder(`suno:${sunoPlaylist.id}`);
    }

    db.prepare('DELETE FROM suno_demo_songs').run();
    db.prepare('DELETE FROM suno_demo_playlists').run();
    clearCustomOrder('suno');

    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(MIGRATION_KEY, '1');
  });

  tx();
}

module.exports = {
  migrateSunoSidebarPlaylistsToUserPlaylists,
  MIGRATION_KEY,
};
