/**
 * Google Flow custom-playlist intake — public page metadata + public GCS clip playback.
 * Severable external-source adapter: disable FLOW_FEATURE_ENABLED and remove this module.
 */
const { getDatabase } = require('../../database');
const { fetchWithUrlPolicy } = require('../../net/fetchWithPolicy');
const userPlaylists = require('../userPlaylists');
const { canonicalizeFlowInput } = require('./flowCanonicalize');
const {
  flowShareUrl,
  flowPageUrl,
  flowManifestUrl,
  FLOW_PLAYBACK_SCOPE,
  parseFlowManifestClipId,
} = require('./flowFeature');

const FLOW_FEATURE_ENABLED = true;

function initFlowSchema(db) {
  if (!FLOW_FEATURE_ENABLED) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS flow_clip_snapshots (
      clip_uuid         TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      artist_name       TEXT NOT NULL,
      cover_url         TEXT,
      playback_url      TEXT NOT NULL,
      sound_prompt      TEXT NOT NULL DEFAULT '',
      lyrics            TEXT NOT NULL DEFAULT '',
      source_page_url   TEXT NOT NULL,
      duration_seconds  REAL,
      fetched_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function isFeatureEnabled() {
  return FLOW_FEATURE_ENABLED;
}

function parseFlowSongPagePayload(html, clipId) {
  const match = String(html).match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return { song: null, author: null };

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return { song: null, author: null };
  }

  const queries = data?.props?.sdc?.queryClient?.queries ?? [];
  let song = null;
  let author = null;

  for (const query of queries) {
    const payload = query?.state?.data;
    if (!payload || typeof payload !== 'object') continue;

    if (!song && payload.id === clipId && typeof payload.title === 'string') {
      song = payload;
      continue;
    }

    if (!author && typeof payload.username === 'string') {
      author = payload;
    }
  }

  return { song, author };
}

function metadataFromFlowPage(ref, song, author) {
  const durationRaw = song?.duration?.value;
  const durationSeconds =
    typeof durationRaw === 'string' && durationRaw.trim()
      ? Number(durationRaw)
      : typeof durationRaw === 'number'
        ? durationRaw
        : null;

  const lyricsText = song?.lyrics?.value?.text ?? '';
  const soundPrompt = song?.operation?.sound_prompt?.trim() ?? '';

  const playbackUrl = String(song?.audio_url || ref.publicClipUrl).trim();
  const coverUrl = song?.image_url?.trim() || null;

  return {
    title: song?.title?.trim() || 'Google Flow Song',
    artistName: author?.username?.trim() || 'Google Flow',
    coverUrl,
    playbackUrl,
    soundPrompt,
    lyrics: typeof lyricsText === 'string' ? lyricsText : '',
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null,
  };
}

function isFlowClipUnavailableBody(body) {
  const text = String(body || '').trim();
  if (!text.startsWith('<?xml') && !text.startsWith('<Error')) return false;
  return text.includes('<Code>NoSuchKey</Code>') || text.includes('No such object');
}

async function fetchFlowSongPage(clipId) {
  const pageUrl = flowShareUrl(clipId);
  return fetchWithUrlPolicy(pageUrl, {
    purpose: 'flow-song-page',
    provenance: { kind: 'flow-song-page', clipId },
    maxRedirects: 3,
    timeoutMs: 20000,
    maxBytes: 2 * 1024 * 1024,
    expectJson: false,
    headers: { Accept: 'text/html' },
  });
}

async function verifyPublicClipAvailable(clipUrl, clipId) {
  const responseText = await fetchWithUrlPolicy(clipUrl, {
    purpose: 'flow-public-clip',
    provenance: { kind: 'flow-public-clip', clipId },
    maxRedirects: 2,
    timeoutMs: 15000,
    maxBytes: 4096,
    expectJson: false,
    skipBody: false,
    headers: { Range: 'bytes=0-0', Accept: 'audio/*,*/*' },
  });

  if (isFlowClipUnavailableBody(responseText)) {
    throw new Error(
      'This Google Flow clip is not publicly available. The creator may have made it private.',
    );
  }
}

function upsertFlowSnapshot(clipId, metadata, sourcePageUrl) {
  getDatabase()
    .prepare(
      `INSERT INTO flow_clip_snapshots (
        clip_uuid, title, artist_name, cover_url, playback_url,
        sound_prompt, lyrics, source_page_url, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(clip_uuid) DO UPDATE SET
        title = excluded.title,
        artist_name = excluded.artist_name,
        cover_url = excluded.cover_url,
        playback_url = excluded.playback_url,
        sound_prompt = excluded.sound_prompt,
        lyrics = excluded.lyrics,
        source_page_url = excluded.source_page_url,
        duration_seconds = excluded.duration_seconds,
        fetched_at = datetime('now')`,
    )
    .run(
      clipId,
      metadata.title,
      metadata.artistName,
      metadata.coverUrl,
      metadata.playbackUrl,
      metadata.soundPrompt,
      metadata.lyrics,
      sourcePageUrl,
      metadata.durationSeconds,
    );
}

function getFlowSnapshot(clipId) {
  return getDatabase()
    .prepare('SELECT * FROM flow_clip_snapshots WHERE clip_uuid = ?')
    .get(clipId);
}

async function fetchFlowMetadata(ref) {
  let html;
  try {
    html = await fetchFlowSongPage(ref.clipId);
  } catch (error) {
    throw new Error('Could not load that Google Flow song page.');
  }

  const { song, author } = parseFlowSongPagePayload(html, ref.clipId);
  if (!song) {
    throw new Error('Could not read metadata from that Google Flow song page.');
  }

  const metadata = metadataFromFlowPage(ref, song, author);

  if (!metadata.playbackUrl.includes('/producer-app-public/clips/')) {
    throw new Error('Only publicly shared Google Flow clips are supported.');
  }

  try {
    await verifyPublicClipAvailable(metadata.playbackUrl, ref.clipId);
  } catch (error) {
    if (error?.message?.includes('publicly available')) throw error;
    throw new Error(
      'This Google Flow clip is not publicly available. The creator may have made it private.',
    );
  }

  upsertFlowSnapshot(ref.clipId, metadata, ref.canonicalShareUrl);
  return metadata;
}

function buildManifestForClipId(clipId) {
  const row = getFlowSnapshot(clipId);
  if (!row) {
    const playlistRow = getDatabase()
      .prepare(
        `SELECT title, artist_name, cover_url, caption, playback_url
         FROM user_playlist_songs
         WHERE external_id = ? AND playback_scope = ?
         ORDER BY id DESC
         LIMIT 1`,
      )
      .get(clipId, FLOW_PLAYBACK_SCOPE);

    return {
      schemaVersion: 1,
      siteRoot: '',
      artistSlug: 'flow',
      artistName: playlistRow?.artist_name ?? 'Google Flow',
      id: clipId,
      slug: clipId,
      title: playlistRow?.title ?? 'Google Flow Song',
      album: '',
      year: '',
      caption: '',
      about: playlistRow?.caption ?? '',
      lyrics: '',
      coverUrl: playlistRow?.cover_url ?? null,
      extraImageUrl: null,
      pageUrl: flowPageUrl(clipId),
      playbackUrl: playlistRow?.playback_url ?? '',
      playbackScope: FLOW_PLAYBACK_SCOPE,
      streamLinks: { youtube: '', spotify: '', soundcloud: '' },
      buildVersion: 'flow',
    };
  }

  return {
    schemaVersion: 1,
    siteRoot: '',
    artistSlug: 'flow',
    artistName: row.artist_name,
    id: clipId,
    slug: clipId,
    title: row.title,
    album: '',
    year: '',
    caption: '',
    about: row.sound_prompt ?? '',
    lyrics: row.lyrics ?? '',
    coverUrl: row.cover_url ?? null,
    extraImageUrl: null,
    pageUrl: flowPageUrl(clipId),
    playbackUrl: row.playback_url,
    playbackScope: FLOW_PLAYBACK_SCOPE,
    streamLinks: { youtube: '', spotify: '', soundcloud: '' },
    buildVersion: 'flow',
  };
}

async function addFlowSongToUserPlaylist(playlistId, input) {
  if (!FLOW_FEATURE_ENABLED) {
    return { ok: false, error: 'Google Flow import is disabled in this build.' };
  }

  const playlist = userPlaylists.getUserPlaylistById(playlistId);
  if (!playlist) return { ok: false, error: 'Playlist not found.' };

  const intake = canonicalizeFlowInput(input);
  if (!intake.ok) return { ok: false, error: intake.error };

  const { ref } = intake;
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
      },
    };
  }

  let metadata;
  try {
    metadata = await fetchFlowMetadata(ref);
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not import that Google Flow song.' };
  }

  const fields = {
    library_song_id: null,
    source_artist_id: 0,
    artist_name: metadata.artistName,
    title: metadata.title,
    album: null,
    year: null,
    caption: metadata.soundPrompt || null,
    cover_url: metadata.coverUrl,
    page_url: pageUrl,
    playback_url: metadata.playbackUrl,
    song_manifest_url: flowManifestUrl(ref.clipId),
    playback_scope: FLOW_PLAYBACK_SCOPE,
    playback_quality: 'standard',
    external_id: ref.clipId,
    duration_seconds:
      metadata.durationSeconds != null ? Math.round(metadata.durationSeconds) : null,
    site_root_normalized: '',
  };

  const entryId = userPlaylists.insertSongFields(playlistId, fields);
  return {
    ok: true,
    data: {
      duplicate: false,
      song: userPlaylists.getPlaylistSongRow(entryId, playlistId),
      count: userPlaylists.getUserPlaylistById(playlistId).song_count,
    },
  };
}

module.exports = {
  FLOW_FEATURE_ENABLED,
  initFlowSchema,
  isFeatureEnabled,
  addFlowSongToUserPlaylist,
  buildManifestForClipId,
  parseFlowManifestClipId,
};
