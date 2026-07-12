/**
 * Snapshot / catalog refresh cadence — keep in sync with shared/listener/cacheRefreshPolicy.ts
 */
const SUNO_SNAPSHOT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const CATALOG_AUTO_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

function parseStoredTimestamp(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const iso = trimmed.includes('T') ? trimmed : `${trimmed.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function isStoredTimestampOlderThan(value, maxAgeMs, nowMs = Date.now()) {
  const parsed = parseStoredTimestamp(value);
  if (parsed == null) return true;
  return nowMs - parsed > maxAgeMs;
}

module.exports = {
  SUNO_SNAPSHOT_REFRESH_MS,
  CATALOG_AUTO_REFRESH_MS,
  parseStoredTimestamp,
  isStoredTimestampOlderThan,
};
