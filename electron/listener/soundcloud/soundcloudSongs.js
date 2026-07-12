/**
 * Add SoundCloud tracks to custom playlists — metadata via public oEmbed.
 */
const { getDatabase } = require('../../database');
const { fetchWithUrlPolicy } = require('../../net/fetchWithPolicy');
const { validateRemoteUrl } = require('../../net/urlPolicy');
const userPlaylists = require('../userPlaylists');
const { canonicalizeSoundcloudInput, withSoundcloudTrackId } = require('./soundcloudCanonicalize');
const { buildSoundcloudIntakeToastMessage } = require('./intakeToast');
const {
  soundcloudPageUrl,
  soundcloudManifestUrl,
  SOUNDCLOUD_PLAYBACK_SCOPE,
  parseSoundcloudManifestTrackId,
} = require('./soundcloudFeature');

const TRACK_API_RE = /api\.soundcloud\.com(?:\/|%2F)tracks(?:\/|%2F)(\d+)/i;
const PLAYLIST_API_RE = /api\.soundcloud\.com(?:\/|%2F)playlists(?:\/|%2F)/i;

async function resolveSoundcloudPermalink(shortUrl) {
  let currentUrl = shortUrl;
  const maxRedirects = 5;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const check = validateRemoteUrl(currentUrl, {
      purpose: 'soundcloud-shortlink',
      provenance: { kind: 'soundcloud-shortlink', url: currentUrl },
    });
    if (!check.ok) {
      throw new Error(check.error || 'SoundCloud short link could not be resolved.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('SoundCloud redirect missing Location header.');
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    if (!response.ok) {
      throw new Error(`SoundCloud link resolution failed (HTTP ${response.status}).`);
    }

    const resolved = canonicalizeSoundcloudInput(currentUrl);
    if (!resolved.ok || resolved.ref.needsRedirectResolve) {
      throw new Error('SoundCloud short link did not resolve to a single track.');
    }
    return resolved.ref.permalink;
  }

  throw new Error('Too many redirects resolving SoundCloud short link.');
}

async function fetchSoundcloudOEmbed(permalink) {
  const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(permalink)}&maxheight=81`;
  return fetchWithUrlPolicy(oembedUrl, {
    purpose: 'soundcloud-oembed',
    provenance: { kind: 'soundcloud-oembed', permalink },
    maxRedirects: 3,
    timeoutMs: 15000,
    maxBytes: 64 * 1024,
    headers: { Accept: 'application/json' },
  });
}

function parseTrackIdFromOEmbed(oembed) {
  const html = typeof oembed?.html === 'string' ? oembed.html : '';
  if (PLAYLIST_API_RE.test(html)) return null;
  const match = html.match(TRACK_API_RE);
  return match?.[1] ?? null;
}

function buildManifestForTrackId(trackId) {
  const row = getDatabase()
    .prepare(
      `SELECT title, artist_name, cover_url, caption, playback_url
       FROM user_playlist_songs
       WHERE external_id = ? AND playback_scope = ?
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(trackId, SOUNDCLOUD_PLAYBACK_SCOPE);

  const permalink = row?.playback_url ?? '';

  return {
    schemaVersion: 1,
    siteRoot: '',
    artistSlug: 'soundcloud',
    artistName: row?.artist_name ?? 'SoundCloud',
    id: trackId,
    slug: trackId,
    title: row?.title ?? 'SoundCloud Track',
    album: '',
    year: '',
    caption: row?.caption ?? '',
    about: '',
    lyrics: '',
    coverUrl: row?.cover_url ?? '',
    extraImageUrl: null,
    pageUrl: soundcloudPageUrl(trackId),
    playbackUrl: permalink,
    playbackScope: SOUNDCLOUD_PLAYBACK_SCOPE,
    streamLinks: { youtube: '', spotify: '', soundcloud: permalink },
    buildVersion: 'soundcloud',
  };
}

async function addSoundcloudSongToUserPlaylist(playlistId, input) {
  const playlist = userPlaylists.getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };

  const intake = canonicalizeSoundcloudInput(input);
  if (!intake.ok) return { ok: false, error: intake.error };

  let { ref, discarded } = intake;
  const intakeNotice = buildSoundcloudIntakeToastMessage(discarded);

  try {
    if (ref.needsRedirectResolve) {
      const permalink = await resolveSoundcloudPermalink(ref.canonicalWatchUrl);
      const resolved = canonicalizeSoundcloudInput(permalink);
      if (!resolved.ok) {
        return { ok: false, error: resolved.error };
      }
      ref = resolved.ref;
      discarded = resolved.discarded;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }

  let oembed;
  try {
    oembed = await fetchSoundcloudOEmbed(ref.permalink);
  } catch {
    return {
      ok: false,
      error: 'Could not load metadata for that SoundCloud link. Paste a public track URL.',
    };
  }

  const trackId = parseTrackIdFromOEmbed(oembed);
  if (!trackId) {
    return {
      ok: false,
      error: 'That SoundCloud link is not a single public track (playlists and profiles are not supported).',
    };
  }

  ref = withSoundcloudTrackId(ref, trackId);
  const pageUrl = ref.canonicalPageUrl;

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

  let title = 'SoundCloud Track';
  let artistName = 'SoundCloud';
  let coverUrl = '';
  if (typeof oembed?.title === 'string' && oembed.title.trim()) title = oembed.title.trim();
  if (typeof oembed?.author_name === 'string' && oembed.author_name.trim()) {
    artistName = oembed.author_name.trim();
  }
  if (typeof oembed?.thumbnail_url === 'string' && oembed.thumbnail_url.trim()) {
    coverUrl = oembed.thumbnail_url.trim();
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
    playback_url: ref.permalink,
    song_manifest_url: soundcloudManifestUrl(trackId),
    playback_scope: SOUNDCLOUD_PLAYBACK_SCOPE,
    playback_quality: 'standard',
    external_id: trackId,
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
  addSoundcloudSongToUserPlaylist,
  buildManifestForTrackId,
  parseSoundcloudManifestTrackId,
};
