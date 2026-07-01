/** True when the Electron preload bridge is available on window.app. */
export function isAppBridgeReady(): boolean {
  return typeof window !== 'undefined' && window.app != null;
}

/**
 * Returns window.app or null. Use before any IPC call so the UI fails gracefully
 * when opened in a plain browser (e.g. http://localhost:5173 without Electron).
 */
export function getApp() {
  return isAppBridgeReady() ? window.app : null;
}

export const BROWSER_ONLY_MESSAGE =
  'Song Pages must run inside the Electron desktop app. From the project folder, run: npm run dev — then use the Electron window that opens, not a browser tab at localhost:5173.';
