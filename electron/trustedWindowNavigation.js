/**
 * Navigation guards for trusted application BrowserWindows (main, VC, visualizer, controller).
 *
 * Production: allow same trusted app document (hash/query navigation preserved).
 * Development: allow same dev-server origin + entry pathname.
 *
 * Drag/drop URL loading is intentionally deferred — see audit follow-up item.
 */
const { shell } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const logger = require('./logger');
const { isAllowedExternalHttpUrl, sanitizeUrlForLog } = require('./net/externalUrl');
const { devServerOrigin } = require('./devServer');

/** @typedef {'main' | 'vc' | 'visualizer' | 'controller'} TrustedWindowRole */

/**
 * @param {string | { toString(): string }} loadTarget
 * @param {boolean} isPackaged
 */
function resolveAllowedDocumentUrl(loadTarget, isPackaged) {
  const target = String(loadTarget);
  // Any explicit URL (dev server, or the packaged loopback static server, or an
  // already-formed file:// URL) is used as-is.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
    return new URL(target).href;
  }
  // Legacy fallback: a bare filesystem path → file URL.
  const absolute = path.isAbsolute(target) ? target : path.resolve(target);
  return pathToFileURL(absolute).href;
}

function documentKey(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol === 'file:') {
      return `file:${parsed.pathname}`;
    }
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

function isAllowedTrustedNavigation(targetUrl, allowedDocumentUrl, isPackaged) {
  const targetKey = documentKey(targetUrl);
  const allowedKey = documentKey(allowedDocumentUrl);
  if (!targetKey || !allowedKey) return false;
  if (targetKey === allowedKey) return true;

  if (!isPackaged) {
    try {
      const target = new URL(targetUrl);
      const allowed = new URL(allowedDocumentUrl);
      if (target.origin === allowed.origin && target.origin === devServerOrigin()) {
        return target.pathname === allowed.pathname;
      }
    } catch {
      return false;
    }
  }

  return false;
}

function logNavigationDenial(role, eventType, destination, reason) {
  const payload = {
    role,
    eventType,
    destination: sanitizeUrlForLog(destination),
    reason,
  };
  logger.warn('Blocked trusted-window navigation', payload);
  if (!require('electron').app.isPackaged) {
    console.warn('[navigation-policy]', payload);
  }
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {{
 *   role: TrustedWindowRole;
 *   allowedDocumentUrl: string;
 *   isPackaged: boolean;
 * }} options
 */
function installTrustedNavigationPolicy(win, options) {
  const { role, allowedDocumentUrl, isPackaged } = options;
  const contents = win.webContents;

  // Persist renderer warnings/errors to the main-process log file. Packaged
  // builds have no DevTools open by default, so this is the only way to see
  // renderer-side failures (e.g. YouTube "[youtube] player error") after the
  // fact. Chromium levels: 0 verbose, 1 info, 2 warning, 3 error — we keep 2+.
  contents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level < 2) return;
    const payload = { role, source: sanitizeUrlForLog(sourceId), line };
    if (level >= 3) {
      logger.error(`[renderer] ${message}`, payload);
    } else {
      logger.warn(`[renderer] ${message}`, payload);
    }
  });

  contents.on('will-navigate', (event, url) => {
    if (isAllowedTrustedNavigation(url, allowedDocumentUrl, isPackaged)) {
      return;
    }
    event.preventDefault();
    logNavigationDenial(role, 'will-navigate', url, 'destination outside trusted app document');
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalHttpUrl(url)) {
      logger.debug('Trusted window opening external URL', { role, destination: sanitizeUrlForLog(url) });
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    logNavigationDenial(role, 'window-open', url, 'blocked non-http(s) window open');
    return { action: 'deny' };
  });
}

module.exports = {
  installTrustedNavigationPolicy,
  resolveAllowedDocumentUrl,
};
