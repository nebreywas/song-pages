/**
 * Google Flow helpers for the main process — keep in sync with shared/flow/flowFeature.ts.
 */

const FLOW_PLAYBACK_SCOPE = 'flow';
const FLOW_PAGE_PREFIX = 'songpages-flow:page/';
const FLOW_MANIFEST_PREFIX = 'songpages-flow:manifest/';
const FLOW_PUBLIC_SHARE_BASE = 'https://www.flowmusic.app/song/';
const FLOW_CLIP_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function flowShareUrl(clipId) {
  return `${FLOW_PUBLIC_SHARE_BASE}${clipId}`;
}

function flowPageUrl(clipId) {
  return `${FLOW_PAGE_PREFIX}${clipId}`;
}

function flowManifestUrl(clipId) {
  return `${FLOW_MANIFEST_PREFIX}${clipId}`;
}

function isFlowSnapshot(pageUrl) {
  return String(pageUrl || '').startsWith(FLOW_PAGE_PREFIX);
}

function parseFlowManifestClipId(url) {
  if (!String(url || '').startsWith(FLOW_MANIFEST_PREFIX)) return null;
  const id = url.slice(FLOW_MANIFEST_PREFIX.length);
  return FLOW_CLIP_UUID_RE.test(id) ? id.toLowerCase() : null;
}

module.exports = {
  FLOW_PLAYBACK_SCOPE,
  FLOW_PAGE_PREFIX,
  FLOW_MANIFEST_PREFIX,
  FLOW_PUBLIC_SHARE_BASE,
  flowShareUrl,
  flowPageUrl,
  flowManifestUrl,
  isFlowSnapshot,
  parseFlowManifestClipId,
};
