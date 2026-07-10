/**
 * Demo-only Suno import — sever by setting SUNO_DEMO_FEATURE_ENABLED to false
 * and the matching flag in shared/demo/sunoDemoFeature.ts.
 */

const SUNO_DEMO_FEATURE_ENABLED = true;

const SUNO_DEMO_ARTIST_ID = -1;
const SUNO_DEMO_SONG_ID_BASE = -2_000_000;
const USER_PLAYLIST_SONG_ID_BASE = -3_000_000;

function isUserPlaylistSongId(songId) {
  return typeof songId === 'number' && songId <= USER_PLAYLIST_SONG_ID_BASE;
}
const SUNO_DEMO_PLAYBACK_SCOPE = 'suno-demo';
const SUNO_DEMO_MANIFEST_PREFIX = 'songpages-suno-demo:manifest/';
const STUDIO_API_BASE = 'https://studio-api.prod.suno.com';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function isFeatureEnabled() {
  return SUNO_DEMO_FEATURE_ENABLED;
}

function isSunoDemoArtistId(artistId) {
  return typeof artistId === 'number' && artistId < 0 && artistId > -10001;
}

function sunoPlaylistArtistId(playlistId) {
  return -playlistId;
}

function sunoPlaylistIdFromArtistId(artistId) {
  if (!isSunoDemoArtistId(artistId)) return null;
  return -artistId;
}

function isSunoDemoSongId(songId) {
  if (isUserPlaylistSongId(songId)) return false;
  return typeof songId === 'number' && songId <= SUNO_DEMO_SONG_ID_BASE;
}

function rowIdFromSongId(songId) {
  return SUNO_DEMO_SONG_ID_BASE - songId;
}

function songIdFromRowId(rowId) {
  return SUNO_DEMO_SONG_ID_BASE - rowId;
}

function sunoDemoManifestUrl(songId) {
  return `${SUNO_DEMO_MANIFEST_PREFIX}${songId}`;
}

function parseManifestSongId(url) {
  if (typeof url !== 'string' || !url.startsWith(SUNO_DEMO_MANIFEST_PREFIX)) return null;
  const id = Number(url.slice(SUNO_DEMO_MANIFEST_PREFIX.length));
  return isSunoDemoSongId(id) ? id : null;
}

function normalizeUserInput(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '');
}

function parseSongIdInput(raw) {
  const trimmed = normalizeUserInput(raw);
  if (!trimmed) return null;
  const match = UUID_RE.exec(trimmed);
  return match ? match[0].toLowerCase() : null;
}

function normalizeHttpUrl(raw) {
  const trimmed = normalizeUserInput(raw);
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function resolveSunoShareUrl(raw) {
  const normalized = normalizeHttpUrl(raw);
  if (!normalized || !normalized.includes('suno.com')) return parseSongIdInput(raw);

  const direct = parseSongIdInput(normalized);
  if (direct && /\/song\//i.test(normalized)) return direct;

  try {
    const response = await fetch(normalized, { redirect: 'follow' });
    const fromFinal = parseSongIdInput(response.url);
    if (fromFinal) return fromFinal;

    const html = await response.text();
    return parseSongIdInput(html);
  } catch {
    return parseSongIdInput(normalized);
  }
}

async function resolveInputToSongId(raw) {
  const trimmed = normalizeUserInput(raw);
  if (!trimmed) return null;

  const directId = parseSongIdInput(trimmed);
  if (directId && /\/song\//i.test(trimmed)) return directId;
  if (directId && !trimmed.includes('suno.com')) return directId;

  if (trimmed.includes('suno.com')) {
    const fromShare = await resolveSunoShareUrl(trimmed);
    if (fromShare) return fromShare;
  }

  return directId;
}

async function fetchStudioClip(songId) {
  const upstreamUrl = `${STUDIO_API_BASE}/api/clip/${songId}`;
  const response = await fetch(upstreamUrl, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok || !data?.id) {
    throw new Error(`Suno clip unavailable (HTTP ${response.status}).`);
  }
  return data;
}

function lyricsFromClip(clip) {
  if (!clip) return '';
  return clip.metadata?.prompt || clip.prompt || clip.lyric || clip.gpt_description_prompt || '';
}

function artistFromClip(clip) {
  return (
    clip?.metadata?.artist ||
    clip?.display_name ||
    clip?.handle ||
    clip?.user_display_name ||
    'Suno'
  );
}

function coverFromClip(clip, songId) {
  return (
    clip?.image_large_url ||
    clip?.image_url ||
    `https://cdn1.suno.ai/image_${songId}.jpeg`
  );
}

function playbackFromClip(clip, songId) {
  return clip?.audio_url || `https://cdn1.suno.ai/${songId}.mp3`;
}

module.exports = {
  SUNO_DEMO_FEATURE_ENABLED,
  SUNO_DEMO_ARTIST_ID,
  SUNO_DEMO_SONG_ID_BASE,
  SUNO_DEMO_PLAYBACK_SCOPE,
  SUNO_DEMO_MANIFEST_PREFIX,
  isFeatureEnabled,
  isSunoDemoArtistId,
  sunoPlaylistArtistId,
  sunoPlaylistIdFromArtistId,
  isSunoDemoSongId,
  rowIdFromSongId,
  songIdFromRowId,
  sunoDemoManifestUrl,
  parseManifestSongId,
  resolveInputToSongId,
  fetchStudioClip,
  lyricsFromClip,
  artistFromClip,
  coverFromClip,
  playbackFromClip,
};
