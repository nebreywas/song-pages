/**
 * Add Suno clips to user playlists — snapshot rows in user_playlist_songs.
 */
const userPlaylists = require('../userPlaylists');
const {
  isFeatureEnabled,
  resolveInputToSongId,
  fetchStudioClip,
  lyricsFromClip,
  artistFromClip,
  coverFromClip,
  playbackFromClip,
  sunoDemoPageUrlFromClipUuid,
  sunoDemoManifestUrlFromClipUuid,
  SUNO_DEMO_PLAYBACK_SCOPE,
  resolveSunoCoverUrl,
} = require('../sunoDemo/feature');

async function addSunoSongToUserPlaylist(playlistId, input) {
  if (!isFeatureEnabled()) {
    return { ok: false, error: 'Suno import is unavailable in this build.' };
  }

  const playlist = userPlaylists.getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };

  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a Suno share link or clip UUID.' };
  }

  let clipUuid;
  try {
    clipUuid = await resolveInputToSongId(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }

  if (!clipUuid) {
    return { ok: false, error: 'Could not parse a Suno clip UUID from that input.' };
  }

  const pageUrl = sunoDemoPageUrlFromClipUuid(clipUuid);
  const duplicateEntryId = userPlaylists.findDuplicateEntryId(playlistId, {
    page_url: pageUrl,
    external_id: clipUuid,
    library_song_id: null,
  });
  if (duplicateEntryId) {
    return {
      ok: true,
      data: {
        provider: 'suno',
        duplicate: true,
        song: userPlaylists.getPlaylistSongRow(duplicateEntryId, playlistId),
        count: userPlaylists.getUserPlaylistById(playlistId).song_count,
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
  const artistName = String(artistFromClip(clip) || 'Suno').trim() || 'Suno';
  const lyrics = lyricsFromClip(clip);
  const durationSeconds =
    typeof clip.metadata?.duration === 'number' && clip.metadata.duration > 0
      ? Math.round(clip.metadata.duration)
      : null;

  const fields = {
    library_song_id: null,
    source_artist_id: 0,
    artist_name: artistName,
    title,
    album: null,
    year: null,
    caption: null,
    cover_url: resolveSunoCoverUrl(clip, clipUuid, null),
    page_url: pageUrl,
    playback_url: playbackFromClip(clip, clipUuid),
    song_manifest_url: sunoDemoManifestUrlFromClipUuid(clipUuid),
    playback_scope: SUNO_DEMO_PLAYBACK_SCOPE,
    playback_quality: 'standard',
    external_id: clipUuid,
    duration_seconds: durationSeconds,
    site_root_normalized: '',
    lyrics,
  };

  const entryId = userPlaylists.insertSongFields(playlistId, fields);
  return {
    ok: true,
    data: {
      provider: 'suno',
      duplicate: false,
      song: userPlaylists.getPlaylistSongRow(entryId, playlistId),
      count: userPlaylists.getUserPlaylistById(playlistId).song_count,
    },
  };
}

module.exports = {
  addSunoSongToUserPlaylist,
};
