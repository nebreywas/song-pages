/**
 * Production static server for the packaged renderer.
 *
 * WHY: In dev, windows load from http://localhost:5173, which gives the page a
 * real web origin. API-controlled YouTube embeds REQUIRE an http(s) origin — a
 * file:// origin makes YouTube's IFrame API refuse to configure and show
 * "Error 153 — Video player configuration error". So in packaged builds we serve
 * the built `dist/` over http://127.0.0.1:<ephemeral-port> and load the windows
 * from there, exactly mirroring dev. Local media (artwork/audio) still come in as
 * file:// URLs and keep working because `webSecurity` is false and the app CSP
 * allows `img-src`/`media-src file:` — the same as dev already does today.
 *
 * The server binds to loopback only and refuses path traversal outside `dist/`.
 *
 * @see documentation/packaged-app-serving.md — full rationale, testing checklist
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { devServerUrl } = require('./devServer');

const DIST_DIR = path.join(__dirname, '..', 'dist');
// Bind the socket to the loopback IP (not exposed to the network)...
const BIND_HOST = '127.0.0.1';
// ...but present the origin as `localhost`. YouTube's embed checks prioritize
// hostnames over IP literals and show "Video unavailable" for many videos when
// the page origin is an IP like 127.0.0.1. Using `localhost` mirrors dev exactly.
// Chromium resolves `localhost` to the loopback address, so it reaches BIND_HOST.
const ORIGIN_HOST = 'localhost';

/** Minimal extension → Content-Type map for the assets Vite emits. */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

/** @type {string | null} */
let serverOrigin = null;
/** @type {Promise<string> | null} */
let startPromise = null;

function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/** Map a request path to a file inside DIST_DIR, blocking traversal escapes. */
function resolveDistFile(requestUrl) {
  let pathname = String(requestUrl).split('?')[0].split('#')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!pathname || pathname === '/') pathname = '/index.html';
  const resolved = path.join(DIST_DIR, path.normalize(pathname));
  const rel = path.relative(DIST_DIR, resolved);
  // Reject anything that climbs out of dist/ (path traversal) or is absolute.
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return resolved;
}

function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }
  const filePath = resolveDistFile(req.url || '/');
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Content-Length': stats.size,
      // Hashed asset names make this safe; avoids stale-cache surprises.
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });
}

/**
 * Start the loopback static server (idempotent). Resolves to the http origin.
 * Uses port 0 so the OS assigns a free ephemeral port.
 */
function startAppServer() {
  if (serverOrigin) return Promise.resolve(serverOrigin);
  if (startPromise) return startPromise;
  startPromise = new Promise((resolve, reject) => {
    const server = http.createServer(handleRequest);
    server.on('error', (err) => {
      logger.error('App static server failed to start', { error: String(err) });
      startPromise = null;
      reject(err);
    });
    server.listen(0, BIND_HOST, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      serverOrigin = `http://${ORIGIN_HOST}:${port}`;
      logger.info('App static server listening', { origin: serverOrigin, bindHost: BIND_HOST });
      resolve(serverOrigin);
    });
  });
  return startPromise;
}

/** Current server origin, or null if it hasn't started yet. */
function appServerOrigin() {
  return serverOrigin;
}

/**
 * Canonical document URL for a window, for both dev and packaged builds.
 * - dev: the Vite dev server URL.
 * - packaged: the loopback static server URL (falls back to a file:// URL if the
 *   server somehow failed to start, so the app still loads).
 * @param {string} pathname e.g. '/index.html' or '/vc-window/vc.html'
 * @param {boolean} isPackaged
 */
function appDocUrl(pathname, isPackaged) {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!isPackaged) return devServerUrl(p);
  if (serverOrigin) return `${serverOrigin}${p}`;
  return require('url').pathToFileURL(path.join(DIST_DIR, p)).href;
}

module.exports = {
  startAppServer,
  appServerOrigin,
  appDocUrl,
};
