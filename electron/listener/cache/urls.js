const { CACHE_SCHEME } = require('./constants');

/** Build a songpages-cache:// URL for a cached file. */
function cacheAssetUrl(cacheId, filename) {
  const encoded = filename
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${CACHE_SCHEME}://entry/${cacheId}/${encoded}`;
}

function parseCacheAssetUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== `${CACHE_SCHEME}:`) return null;
    if (parsed.hostname !== 'entry') return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const cacheId = parts[0];
    const filename = decodeURIComponent(parts.slice(1).join('/'));
    return { cacheId, filename };
  } catch {
    return null;
  }
}

/** Same cache entry prefix — guest webview may load subresources from the entry. */
function isSameCacheEntry(allowedUrl, targetUrl) {
  const allowed = parseCacheAssetUrl(allowedUrl);
  const target = parseCacheAssetUrl(targetUrl);
  if (!allowed || !target) return false;
  return allowed.cacheId === target.cacheId;
}

function extensionFromUrl(urlString, fallback = 'bin') {
  try {
    const pathname = new URL(urlString).pathname;
    const base = pathname.split('/').pop() || '';
    const dot = base.lastIndexOf('.');
    if (dot > 0 && dot < base.length - 1) {
      return base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || fallback;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function resolveRemoteUrl(baseUrl, reference) {
  const trimmed = String(reference || '').trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('data:')) return null;
  if (/^(?:mailto:|tel:|javascript:)/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

module.exports = {
  cacheAssetUrl,
  parseCacheAssetUrl,
  isSameCacheEntry,
  extensionFromUrl,
  resolveRemoteUrl,
};
