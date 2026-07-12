/**
 * YouTube canonicalization for the main process — keep in sync with
 * shared/providers/youtube/canonicalize.ts
 */

const YOUTUBE_PAGE_PREFIX = 'songpages-youtube:watch/';
const VIDEO_ID_RE = /^[\w-]{11}$/;

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);

function canonicalWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function canonicalPageUrl(videoId) {
  return `${YOUTUBE_PAGE_PREFIX}${videoId}`;
}

function buildRef(videoId) {
  return {
    provider: 'youtube',
    videoId,
    externalId: videoId,
    canonicalWatchUrl: canonicalWatchUrl(videoId),
    canonicalPageUrl: canonicalPageUrl(videoId),
  };
}

function noteForDiscardedParam(key, value) {
  if (key === 'list') return `playlist context (list=${value})`;
  if (key === 'index') return `playlist index (index=${value})`;
  if (key === 'start_radio') return 'YouTube radio / mix (start_radio)';
  if (key === 't' || key === 'start' || key === 'time_continue') {
    return `start offset (${key}=${value}) — not applied; Song Pages transport starts at 0`;
  }
  if (key === 'end') return `end offset (end=${value})`;
  if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') return `tracking (${key})`;
  if (key === 'feature' || key === 'pp' || key === 'si' || key === 'ab_channel') {
    return `recommendation / share funnel (${key}=${value})`;
  }
  return `non-canonical query param (${key}=${value})`;
}

function collectDiscardedParams(url) {
  const queryParams = {};
  const notes = [];

  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'v') continue;
    queryParams[key] = value;
    const note = noteForDiscardedParam(key, value);
    if (note) notes.push(note);
  }

  return { queryParams, notes };
}

function parseVideoIdFromUrl(url) {
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? '';
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) return null;

  const fromQuery = url.searchParams.get('v');
  if (fromQuery && VIDEO_ID_RE.test(fromQuery)) return fromQuery;

  const parts = url.pathname.split('/').filter(Boolean);
  for (const segment of ['shorts', 'embed', 'live']) {
    const index = parts.indexOf(segment);
    const id = index >= 0 ? parts[index + 1] : null;
    if (id && VIDEO_ID_RE.test(id)) return id;
  }

  return null;
}

function canonicalizeYoutubeInput(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return { ok: false, error: 'Enter a YouTube URL or 11-character video ID.' };

  if (VIDEO_ID_RE.test(trimmed)) {
    return {
      ok: true,
      ref: buildRef(trimmed),
      discarded: { queryParams: {}, notes: [] },
    };
  }

  try {
    const url = new URL(trimmed);
    const videoId = parseVideoIdFromUrl(url);
    if (!videoId) {
      return { ok: false, error: 'Could not find a valid YouTube video ID in that URL.' };
    }

    return {
      ok: true,
      ref: buildRef(videoId),
      discarded: collectDiscardedParams(url),
    };
  } catch {
    return { ok: false, error: 'Enter a valid YouTube URL or 11-character video ID.' };
  }
}

function parseYoutubeVideoId(input) {
  const result = canonicalizeYoutubeInput(input);
  return result.ok ? result.ref.videoId : null;
}

module.exports = {
  canonicalizeYoutubeInput,
  parseYoutubeVideoId,
};
