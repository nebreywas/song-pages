/**
 * Add YouTube videos to custom playlists — metadata via public oEmbed.
 */
const { getDatabase } = require('../../database');
const { fetchWithUrlPolicy } = require('../../net/fetchWithPolicy');
const userPlaylists = require('../userPlaylists');
const { canonicalizeYoutubeInput } = require('./youtubeCanonicalize');
const { buildYoutubeIntakeToastMessage } = require('./intakeToast');
const {
  youtubeWatchUrl,
  youtubePageUrl,
  youtubeManifestUrl,
  youtubeThumbnailUrl,
  YOUTUBE_PLAYBACK_SCOPE,
  parseYoutubeManifestVideoId,
} = require('./youtubeFeature');

async function fetchYoutubeOEmbed(videoId) {
  const watchUrl = youtubeWatchUrl(videoId);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  return fetchWithUrlPolicy(oembedUrl, {
    purpose: 'youtube-oembed',
    provenance: { kind: 'youtube-oembed', videoId },
    maxRedirects: 3,
    timeoutMs: 15000,
    maxBytes: 64 * 1024,
    headers: { Accept: 'application/json' },
  });
}

function buildManifestForVideoId(videoId) {
  const row = getDatabase()
    .prepare(
      `SELECT title, artist_name, cover_url, caption
       FROM user_playlist_songs
       WHERE external_id = ? AND playback_scope = ?
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(videoId, YOUTUBE_PLAYBACK_SCOPE);

  return {
    schemaVersion: 1,
    siteRoot: '',
    artistSlug: 'youtube',
    artistName: row?.artist_name ?? 'YouTube',
    id: videoId,
    slug: videoId,
    title: row?.title ?? 'YouTube Video',
    album: '',
    year: '',
    caption: row?.caption ?? '',
    about: '',
    lyrics: '',
    coverUrl: row?.cover_url ?? youtubeThumbnailUrl(videoId),
    extraImageUrl: null,
    pageUrl: youtubePageUrl(videoId),
    playbackUrl: youtubeWatchUrl(videoId),
    playbackScope: YOUTUBE_PLAYBACK_SCOPE,
    streamLinks: { youtube: youtubeWatchUrl(videoId), spotify: '', soundcloud: '' },
    buildVersion: 'youtube',
  };
}

async function addYoutubeSongToUserPlaylist(playlistId, input) {
  const playlist = userPlaylists.getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };

  const intake = canonicalizeYoutubeInput(input);
  if (!intake.ok) return { ok: false, error: intake.error };

  const { ref, discarded } = intake;
  const pageUrl = ref.canonicalPageUrl;
  const intakeNotice = buildYoutubeIntakeToastMessage(discarded);
  const duplicateEntryId = userPlaylists.findDuplicateEntryId(playlistId, {
    page_url: pageUrl,
    library_song_id: null,
  });
  if (duplicateEntryId) {
    return {
      ok: true,
      data: {
        duplicate: true,
        song: userPlaylists.getPlaylistSongRow(duplicateEntryId, playlistId),
        count: userPlaylists.getUserPlaylistById(playlistId).song_count,
        intakeNotice,
      },
    };
  }

  let title = 'YouTube Video';
  let artistName = 'YouTube';
  let coverUrl = youtubeThumbnailUrl(ref.videoId);
  try {
    const oembed = await fetchYoutubeOEmbed(ref.videoId);
    if (typeof oembed?.title === 'string' && oembed.title.trim()) title = oembed.title.trim();
    if (typeof oembed?.author_name === 'string' && oembed.author_name.trim()) {
      artistName = oembed.author_name.trim();
    }
    if (typeof oembed?.thumbnail_url === 'string' && oembed.thumbnail_url.trim()) {
      coverUrl = oembed.thumbnail_url.trim();
    }
  } catch {
    // oEmbed failed — still add with fallback title so intake remains usable offline.
  }

  const fields = {
    library_song_id: null,
    source_artist_id: 0,
    artist_name: artistName,
    title,
    album: null,
    year: null,
    caption: null,
    cover_url: coverUrl,
    page_url: pageUrl,
    playback_url: ref.canonicalWatchUrl,
    song_manifest_url: youtubeManifestUrl(ref.videoId),
    playback_scope: YOUTUBE_PLAYBACK_SCOPE,
    playback_quality: 'standard',
    external_id: ref.videoId,
    duration_seconds: null,
    site_root_normalized: '',
  };

  const entryId = userPlaylists.insertSongFields(playlistId, fields);
  return {
    ok: true,
    data: {
      duplicate: false,
      song: userPlaylists.getPlaylistSongRow(entryId, playlistId),
      count: userPlaylists.getUserPlaylistById(playlistId).song_count,
      intakeNotice,
    },
  };
}

module.exports = {
  addYoutubeSongToUserPlaylist,
  buildManifestForVideoId,
  parseYoutubeManifestVideoId,
};
