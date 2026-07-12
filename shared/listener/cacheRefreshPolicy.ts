/** Suno demo + custom-playlist Suno snapshots — background metadata refresh cadence. */
export const SUNO_SNAPSHOT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/** Subscribed artist / Song Pages catalog mirrors — automatic refresh cadence. */
export const CATALOG_AUTO_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

/** Parse SQLite `datetime('now')` or ISO timestamps for age checks. */
export function parseStoredTimestamp(value: string | null | undefined): number | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const iso = trimmed.includes('T') ? trimmed : `${trimmed.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function isStoredTimestampOlderThan(
  value: string | null | undefined,
  maxAgeMs: number,
  nowMs: number = Date.now(),
): boolean {
  const parsed = parseStoredTimestamp(value);
  if (parsed == null) return true;
  return nowMs - parsed > maxAgeMs;
}
