/** Settings key — max cached songs (v1 uses entry count, not disk bytes). */
const CACHE_MAX_ENTRIES_KEY = 'cache.maxSongEntries';

/** Default LRU capacity for development / v1. */
const DEFAULT_MAX_CACHE_ENTRIES = 12;

const CACHE_SCHEME = 'songpages-cache';

module.exports = {
  CACHE_MAX_ENTRIES_KEY,
  DEFAULT_MAX_CACHE_ENTRIES,
  CACHE_SCHEME,
};
