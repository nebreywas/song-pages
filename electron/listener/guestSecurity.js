/**
 * Per-guest navigation and window policy for Song Page webviews.
 *
 * Treats remote pages as untrusted: block escape from current page, open external
 * targets in the system browser, deny popups and privileged APIs.
 */
const { shell, webContents } = require('electron');
const logger = require('../logger');
const { isSameCacheEntry } = require('./cache/urls');

/** @type {Map<number, string>} webContentsId → normalized allowed page URL */
const allowedPageByGuestId = new Map();

function normalizePageUrl(url) {
  const parsed = new URL(url);
  parsed.hash = '';
  // Keep query string — cache-bust and songpagesApp must remain valid on reload.
  return parsed.toString();
}

function isAllowedGuestNavigation(allowedPageUrl, targetUrl) {
  try {
    const allowed = new URL(allowedPageUrl);
    const target = new URL(targetUrl);

    if (allowed.protocol === 'songpages-cache:' || target.protocol === 'songpages-cache:') {
      return isSameCacheEntry(allowedPageUrl, targetUrl);
    }

    if (allowed.origin !== target.origin) {
      return false;
    }

    // Same song page document — pathname must match (hash-only changes allowed).
    return allowed.pathname === target.pathname;
  } catch {
    return false;
  }
}

function openExternally(url) {
  logger.debug('Opening external URL from Song Page guest', { url });
  void shell.openExternal(url);
}

/**
 * Attach security handlers to a webview guest WebContents instance.
 * @param {import('electron').WebContents} guestContents
 * @param {string} allowedPageUrl — canonical song page URL (with songpagesApp=1)
 */
function bindSongPageGuest(guestContents, allowedPageUrl) {
  if (!guestContents || guestContents.isDestroyed()) {
    return { ok: false, error: 'Guest web contents unavailable.' };
  }

  const guestId = guestContents.id;
  const allowed = normalizePageUrl(allowedPageUrl);
  allowedPageByGuestId.set(guestId, allowed);

  const onWillNavigate = (event, url) => {
    if (isAllowedGuestNavigation(allowed, url)) {
      return;
    }
    event.preventDefault();
    openExternally(url);
  };

  const onWillRedirect = (event, url) => {
    if (isAllowedGuestNavigation(allowed, url)) {
      return;
    }
    event.preventDefault();
    openExternally(url);
  };

  guestContents.setWindowOpenHandler(({ url }) => {
    if (url) {
      openExternally(url);
    }
    return { action: 'deny' };
  });

  guestContents.on('will-navigate', onWillNavigate);
  guestContents.on('will-redirect', onWillRedirect);

  guestContents.once('destroyed', () => {
    allowedPageByGuestId.delete(guestId);
    if (!guestContents.isDestroyed()) {
      guestContents.removeListener('will-navigate', onWillNavigate);
      guestContents.removeListener('will-redirect', onWillRedirect);
    }
  });

  logger.debug('Song Page guest security bound', { guestId, allowed });

  return { ok: true };
}

function bindSongPageGuestById(guestWebContentsId, allowedPageUrl) {
  const guest = webContents.fromId(guestWebContentsId);
  if (!guest) {
    return { ok: false, error: 'Guest web contents not found.' };
  }
  return bindSongPageGuest(guest, allowedPageUrl);
}

module.exports = {
  bindSongPageGuest,
  bindSongPageGuestById,
  isAllowedGuestNavigation,
};
