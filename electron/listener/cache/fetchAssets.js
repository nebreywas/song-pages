const FETCH_TIMEOUT_MS = 30000;

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

/** Collect same-origin asset URLs referenced by a song page HTML document. */
function extractHtmlAssetUrls(html, pageUrl) {
  const pageOrigin = new URL(pageUrl).origin;
  const found = new Set();
  const pattern = /\b(?:href|src)=["']([^"']+)["']/gi;

  for (const match of html.matchAll(pattern)) {
    const reference = match[1];
    if (!reference || reference.startsWith('#') || reference.startsWith('data:')) continue;
    if (/^(?:mailto:|tel:|javascript:)/i.test(reference)) continue;
    try {
      const resolved = new URL(reference, pageUrl);
      if (resolved.origin !== pageOrigin) continue;
      found.add(resolved.toString());
    } catch {
      /* ignore bad URLs */
    }
  }

  return [...found];
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

function rewriteHtmlForCache(html, pageUrl, cacheId, remoteToLocal) {
  const { cacheAssetUrl } = require('./urls');
  let output = html;

  for (const [remoteUrl, localFilename] of remoteToLocal.entries()) {
    const localUrl = cacheAssetUrl(cacheId, localFilename);
    output = output.split(remoteUrl).join(localUrl);
    try {
      const parsed = new URL(remoteUrl);
      const pathOnly = `${parsed.pathname}${parsed.search}`;
      output = output.split(pathOnly).join(localUrl);
    } catch {
      /* ignore */
    }
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
  fetchBuffer,
  extractHtmlAssetUrls,
  parseMediaPlaylist,
  rewriteHtmlForCache,
  rewritePlaylistForCache,
};
