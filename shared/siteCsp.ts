/**
 * Content-Security-Policy baked into every compiled Song Page by the compiler.
 * Limits script/style/media origins to same-site assets only.
 */
export const SONG_PAGES_SITE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

export const SONG_PAGES_SITE_CSP_META = `<meta http-equiv="Content-Security-Policy" content="${SONG_PAGES_SITE_CSP}" />`;

/** Compiled pages load `shared/js/site-app-mode.js` in <head> (CSP-safe vs inline). */
