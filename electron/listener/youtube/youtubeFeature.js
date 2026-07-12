/**
 * YouTube helpers for the main process — keep in sync with shared/youtube/youtubeFeature.ts.
 */

const YOUTUBE_PLAYBACK_SCOPE = 'youtube';
const YOUTUBE_PAGE_PREFIX = 'songpages-youtube:watch/';
const YOUTUBE_MANIFEST_PREFIX = 'songpages-youtube:manifest/';
const VIDEO_ID_RE = /^[\w-]{11}$/;

function parseYoutubeVideoId(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  if (VIDEO_ID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0] ?? '';
      return VIDEO_ID_RE.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const fromQuery = url.searchParams.get('v');
      if (fromQuery && VIDEO_ID_RE.test(fromQuery)) return fromQuery;

      const parts = url.pathname.split('/').filter(Boolean);
      for (const segment of ['shorts', 'embed', 'live']) {
        const index = parts.indexOf(segment);
        const id = index >= 0 ? parts[index + 1] : null;
        if (id && VIDEO_ID_RE.test(id)) return id;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function youtubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function youtubePageUrl(videoId) {
  return `${YOUTUBE_PAGE_PREFIX}${videoId}`;
}

function youtubeManifestUrl(videoId) {
  return `${YOUTUBE_MANIFEST_PREFIX}${videoId}`;
}

function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function isYoutubeSnapshot(pageUrl) {
  return String(pageUrl || '').startsWith(YOUTUBE_PAGE_PREFIX);
}

function parseYoutubeManifestVideoId(url) {
  if (!String(url || '').startsWith(YOUTUBE_MANIFEST_PREFIX)) return null;
  const id = url.slice(YOUTUBE_MANIFEST_PREFIX.length);
  return VIDEO_ID_RE.test(id) ? id : null;
}

module.exports = {
  YOUTUBE_PLAYBACK_SCOPE,
  YOUTUBE_PAGE_PREFIX,
  YOUTUBE_MANIFEST_PREFIX,
  parseYoutubeVideoId,
  youtubeWatchUrl,
  youtubePageUrl,
  youtubeManifestUrl,
  youtubeThumbnailUrl,
  isYoutubeSnapshot,
  parseYoutubeManifestVideoId,
};
