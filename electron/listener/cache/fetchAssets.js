const FETCH_TIMEOUT_MS = 30000;

/** Bump when cached page HTML rewrite rules change — stale entries are repopulated. */
const CACHE_HTML_REWRITE_REVISION = '3';

const HTML_ASSET_ATTR_PATTERN =
  /\b(?:href|src|data-cover-src)=["']([^"']+)["']/gi;

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: '*/*' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDocumentUrl(url) {
  const parsed = new URL(url);
  parsed.hash = '';
  // Cache-bust query params should not make canonical links look like separate assets.
  parsed.search = '';
  return parsed.toString();
}

function isSameDocumentUrl(candidateUrl, pageUrl) {
  try {
    return normalizeDocumentUrl(candidateUrl) === normalizeDocumentUrl(pageUrl);
  } catch {
    return false;
  }
}

/**
 * Collect same-origin asset references from a song page HTML document.
 * Returns both the literal attribute value and its resolved absolute URL.
 */
function extractHtmlAssetReferences(html, pageUrl) {
  const pageOrigin = new URL(pageUrl).origin;
  const found = [];

  for (const match of html.matchAll(HTML_ASSET_ATTR_PATTERN)) {
    const reference = match[1];
    if (!reference || reference.startsWith('#') || reference.startsWith('data:')) continue;
    if (/^(?:mailto:|tel:|javascript:)/i.test(reference)) continue;
    try {
      const resolved = new URL(reference, pageUrl);
      if (resolved.origin !== pageOrigin) continue;
      found.push({ reference, resolvedUrl: resolved.toString() });
    } catch {
      /* ignore bad URLs */
    }
  }

  return found;
}

/** Collect same-origin asset URLs referenced by a song page HTML document. */
function extractHtmlAssetUrls(html, pageUrl) {
  const urls = new Set();
  for (const { resolvedUrl } of extractHtmlAssetReferences(html, pageUrl)) {
    urls.add(resolvedUrl);
  }
  return [...urls];
}

/**
 * Parse a VOD HLS media playlist — returns absolute segment URLs in order.
 * v1 intentionally ignores master playlists (Song Pages sites ship media playlists).
 */
function parseMediaPlaylist(content, playlistUrl) {
  const segments = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    try {
      segments.push(new URL(trimmed, playlistUrl).toString());
    } catch {
      /* skip */
    }
  }
  return segments;
}

/**
 * Rewrite cached page HTML so subresources load from songpages-cache:// URLs.
 * Uses the original attribute strings from the source HTML (e.g. ../js/site.css)
 * instead of pathname-only replacement, which breaks relative references.
 */
function rewriteHtmlForCache(html, pageUrl, cacheId, remoteToLocal, htmlReferences = new Map()) {
  const { cacheAssetUrl } = require('./urls');
  const replacements = [];

  for (const [remoteUrl, localFilename] of remoteToLocal.entries()) {
    const localUrl = cacheAssetUrl(cacheId, localFilename);
    replacements.push({ from: remoteUrl, to: localUrl });

    const refs = htmlReferences.get(remoteUrl);
    if (refs) {
      for (const ref of refs) {
        replacements.push({ from: ref, to: localUrl });
      }
    }
  }

  replacements.sort((a, b) => b.from.length - a.from.length);

  let output = html;
  for (const { from, to } of replacements) {
    if (!from || from === to) continue;
    output = output.split(from).join(to);
  }

  return output;
}

function rewritePlaylistForCache(content, playlistUrl, cacheId, remoteToLocal) {
  const { cacheAssetUrl } = require('./urls');
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      try {
        const remote = new URL(trimmed, playlistUrl).toString();
        const localFilename = remoteToLocal.get(remote);
        if (!localFilename) return line;
        return cacheAssetUrl(cacheId, localFilename);
      } catch {
        return line;
      }
    })
    .join('\n');
}

module.exports = {
  CACHE_HTML_REWRITE_REVISION,
  fetchBuffer,
  extractHtmlAssetReferences,
  extractHtmlAssetUrls,
  isSameDocumentUrl,
  parseMediaPlaylist,
  rewriteHtmlForCache,
  rewritePlaylistForCache,
};
