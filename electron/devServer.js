/**
 * Single source of truth for Vite dev server origin used by main and secondary windows.
 * Override with SONG_PAGES_DEV_ORIGIN (full origin, e.g. http://127.0.0.1:5173).
 */
const DEV_SERVER_ORIGIN = (process.env.SONG_PAGES_DEV_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');

function devServerUrl(pathname) {
  const pathPart = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${DEV_SERVER_ORIGIN}${pathPart}`;
}

function devServerOrigin() {
  return DEV_SERVER_ORIGIN;
}

module.exports = {
  devServerOrigin,
  devServerUrl,
};
