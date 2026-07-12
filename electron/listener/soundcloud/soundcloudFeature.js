/**
 * SoundCloud helpers for the main process — keep in sync with shared/soundcloud/soundcloudFeature.ts.
 */

const SOUNDCLOUD_PLAYBACK_SCOPE = 'soundcloud';
const SOUNDCLOUD_PAGE_PREFIX = 'songpages-soundcloud:track/';
const SOUNDCLOUD_MANIFEST_PREFIX = 'songpages-soundcloud:manifest/';
const TRACK_ID_RE = /^\d+$/;

function soundcloudPageUrl(trackId) {
  return `${SOUNDCLOUD_PAGE_PREFIX}${trackId}`;
}

function soundcloudManifestUrl(trackId) {
  return `${SOUNDCLOUD_MANIFEST_PREFIX}${trackId}`;
}

function isSoundcloudSnapshot(pageUrl) {
  return String(pageUrl || '').startsWith(SOUNDCLOUD_PAGE_PREFIX);
}

function parseSoundcloudManifestTrackId(url) {
  if (!String(url || '').startsWith(SOUNDCLOUD_MANIFEST_PREFIX)) return null;
  const id = url.slice(SOUNDCLOUD_MANIFEST_PREFIX.length);
  return TRACK_ID_RE.test(id) ? id : null;
}

module.exports = {
  SOUNDCLOUD_PLAYBACK_SCOPE,
  SOUNDCLOUD_PAGE_PREFIX,
  SOUNDCLOUD_MANIFEST_PREFIX,
  soundcloudPageUrl,
  soundcloudManifestUrl,
  isSoundcloudSnapshot,
  parseSoundcloudManifestTrackId,
};
