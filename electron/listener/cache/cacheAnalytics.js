/**
 * In-memory cache event log for the Developer page and file logger.
 * Ring buffer — not persisted across app restarts (SQLite holds cache metadata).
 */
const logger = require('../../logger');

const MAX_EVENTS = 500;

/** @type {Array<{ id: number; at: string; type: string; [key: string]: unknown }>} */
const events = [];

let eventSeq = 0;

/**
 * Record a cache lifecycle event. Also writes to the main process log file
 * with a `cache:` prefix so exports remain searchable.
 */
function recordCacheEvent(type, detail = {}) {
  const entry = {
    id: ++eventSeq,
    at: new Date().toISOString(),
    type,
    ...detail,
  };

  events.unshift(entry);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  const logMeta = { cacheEvent: type, ...detail };
  if (type.endsWith('_failed') || type === 'cache_remove' || type.startsWith('invalidate')) {
    logger.warn(`cache:${type}`, logMeta);
  } else if (type === 'resolve_hit' || type === 'touch') {
    logger.debug(`cache:${type}`, logMeta);
  } else {
    logger.info(`cache:${type}`, logMeta);
  }

  return entry;
}

function getCacheEvents(limit = 200) {
  const capped = Math.min(Math.max(1, limit), MAX_EVENTS);
  return events.slice(0, capped);
}

function clearCacheEvents() {
  events.length = 0;
}

module.exports = {
  recordCacheEvent,
  getCacheEvents,
  clearCacheEvents,
};
