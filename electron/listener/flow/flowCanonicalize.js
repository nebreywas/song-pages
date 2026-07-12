/**
 * Google Flow canonicalization for the main process — keep in sync with
 * shared/providers/flow/canonicalize.ts
 */

const FLOW_PAGE_PREFIX = 'songpages-flow:page/';
const FLOW_CLIP_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FLOW_SONG_PAGE_HOSTS = new Set(['flowmusic.app', 'www.flowmusic.app']);
const FLOW_PUBLIC_CLIP_HOST = 'storage.googleapis.com';
const FLOW_PUBLIC_CLIP_PATH_PREFIX = '/producer-app-public/clips/';
const FLOW_PRIVATE_CLIP_PATH_MARKER = 'producer-app-private';
const FLOW_PUBLIC_SHARE_BASE = 'https://www.flowmusic.app/song/';

function buildRef(clipId) {
  const normalized = clipId.toLowerCase();
  return {
    provider: 'flow',
    clipId: normalized,
    externalId: normalized,
    canonicalShareUrl: `${FLOW_PUBLIC_SHARE_BASE}${normalized}`,
    canonicalPageUrl: `${FLOW_PAGE_PREFIX}${normalized}`,
    publicClipUrl: `https://${FLOW_PUBLIC_CLIP_HOST}${FLOW_PUBLIC_CLIP_PATH_PREFIX}${normalized}.m4a`,
  };
}

function isSignedGcsUrl(url) {
  return [...url.searchParams.keys()].some((key) => key.startsWith('X-Goog-'));
}

function parseClipIdFromShareUrl(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!FLOW_SONG_PAGE_HOSTS.has(host)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const songIndex = parts.indexOf('song');
  const id = songIndex >= 0 ? parts[songIndex + 1] : null;
  return id && FLOW_CLIP_UUID_RE.test(id) ? id.toLowerCase() : null;
}

function parseClipIdFromPublicClipUrl(url) {
  if (url.hostname !== FLOW_PUBLIC_CLIP_HOST) return null;
  if (!url.pathname.startsWith(FLOW_PUBLIC_CLIP_PATH_PREFIX)) return null;
  if (url.pathname.includes(FLOW_PRIVATE_CLIP_PATH_MARKER)) return null;
  if (isSignedGcsUrl(url)) return null;

  const file = url.pathname.slice(FLOW_PUBLIC_CLIP_PATH_PREFIX.length);
  const match = /^([0-9a-f-]{36})\.m4a$/i.exec(file);
  return match ? match[1].toLowerCase() : null;
}

function canonicalizeFlowInput(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a Google Flow song URL or clip UUID.' };
  }

  if (FLOW_CLIP_UUID_RE.test(trimmed)) {
    return { ok: true, ref: buildRef(trimmed) };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Enter a valid Google Flow song URL or clip UUID.' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Google Flow links must use https.' };
  }

  if (url.pathname.includes(FLOW_PRIVATE_CLIP_PATH_MARKER)) {
    return {
      ok: false,
      error: 'Private Google Flow clips are not supported — paste a public flowmusic.app song link.',
    };
  }

  if (isSignedGcsUrl(url)) {
    return {
      ok: false,
      error: 'Temporary signed Google Flow URLs are not supported — paste a public flowmusic.app song link.',
    };
  }

  const fromShare = parseClipIdFromShareUrl(url);
  if (fromShare) return { ok: true, ref: buildRef(fromShare) };

  const fromPublicClip = parseClipIdFromPublicClipUrl(url);
  if (fromPublicClip) return { ok: true, ref: buildRef(fromPublicClip) };

  return {
    ok: false,
    error: 'Could not find a valid public Google Flow song in that URL.',
  };
}

module.exports = {
  canonicalizeFlowInput,
};
