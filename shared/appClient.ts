/**
 * Song Pages desktop app presentation mode.
 *
 * Listener Mode loads canonical pages with ?songpagesApp=1. Compiled templates
 * detect this and hide browser-only chrome. The Electron app never injects CSS
 * into guest pages — presentation is compiler-controlled.
 */

export const SONG_PAGES_APP_QUERY_KEY = 'songpagesApp';
export const SONG_PAGES_APP_QUERY_VALUE = '1';
export const SONG_PAGES_APP_CLASS = 'songpages-app-client';

/** Legacy alias — recompiled sites use songpagesApp; kept for reference only. */
export const SONG_PAGES_LEGACY_EMBED_QUERY_KEY = 'songpagesEmbed';

/** Append app-mode query param without dropping existing params (e.g. cache-bust ?v=). */
export function appendSongPagesAppParam(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(SONG_PAGES_APP_QUERY_KEY, SONG_PAGES_APP_QUERY_VALUE);
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${SONG_PAGES_APP_QUERY_KEY}=${SONG_PAGES_APP_QUERY_VALUE}`;
  }
}

/** Guest webview partition — isolated session, hardened in main process. */
export const SONG_PAGES_GUEST_PARTITION = 'persist:songpages-guest';

/**
 * webpreferences for <webview> guests — untrusted remote content.
 * No nodeIntegration, no preload, sandbox enabled.
 */
export const SONG_PAGES_GUEST_WEB_PREFERENCES =
  'contextIsolation=true,nodeIntegration=false,sandbox=true,javascript=true';
