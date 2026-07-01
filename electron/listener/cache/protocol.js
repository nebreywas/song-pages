const path = require('path');
const { protocol } = require('electron');
const { CACHE_SCHEME } = require('./constants');
const { parseCacheAssetUrl } = require('./urls');
const { resolveEntryFilePath } = require('./storage');

const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function mimeForFilename(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

/** Register privileged cache scheme — call before app.whenReady(). */
function registerCacheScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: CACHE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

/** Serve cached song assets from opaque on-disk directories. */
function registerCacheProtocol() {
  protocol.handle(CACHE_SCHEME, async (request) => {
    const parsed = parseCacheAssetUrl(request.url);
    if (!parsed) {
      return new Response('Not found', { status: 404 });
    }

    let filePath;
    try {
      filePath = resolveEntryFilePath(parsed.cacheId, parsed.filename);
    } catch {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const data = await require('fs/promises').readFile(filePath);
      return new Response(data, {
        headers: {
          'Content-Type': mimeForFilename(parsed.filename),
          'Cache-Control': 'private, max-age=31536000',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

module.exports = {
  registerCacheScheme,
  registerCacheProtocol,
};
