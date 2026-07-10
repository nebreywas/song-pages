/**
 * Enrich VC state payloads on the main process before they reach projection windows.
 * Host graphic popup URLs are resolved here so VC mode does not depend on renderer timing.
 */
const { pathToFileURL } = require('url');

const database = require('./database');
const { resolveMediaPath } = require('./hostContent');

const HOST_CONTENT_SETTINGS_KEY = 'vc.hostContent';

/** Keep lookup rules aligned with shared/hostContent/migrate.ts + useHostGraphicPopupUrl.ts */
function findGraphicMediaPath(catalog, graphicId) {
  if (!catalog || typeof catalog !== 'object' || !graphicId) return null;

  const items = Array.isArray(catalog.items) ? catalog.items : [];
  const item = items.find((row) => row && row.id === graphicId);
  if (!item || item.type !== 'graphic') return null;

  const mediaPath = typeof item.mediaPath === 'string' ? item.mediaPath.trim() : '';
  return mediaPath || null;
}

function resolveHostGraphicPopupUrl(config) {
  const popupId =
    config && typeof config.hostGraphicPopupId === 'string' ? config.hostGraphicPopupId.trim() : '';
  if (!popupId) return null;

  const catalog = database.getSetting(HOST_CONTENT_SETTINGS_KEY);
  const mediaPath = findGraphicMediaPath(catalog, popupId);
  if (!mediaPath) return null;

  const absolute = resolveMediaPath(mediaPath);
  if (!absolute) return null;

  try {
    return pathToFileURL(absolute).href;
  } catch {
    return null;
  }
}

/** Attach a resolved hostGraphicUrl when the VC config selects a popup graphic. */
function enrichVcStatePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const resolved = resolveHostGraphicPopupUrl(payload.config);
  if (!resolved) return payload;

  if (payload.hostGraphicUrl === resolved) return payload;
  return { ...payload, hostGraphicUrl: resolved };
}

module.exports = {
  enrichVcStatePayload,
  resolveHostGraphicPopupUrl,
  findGraphicMediaPath,
};
