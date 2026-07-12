import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CATALOG_AUTO_REFRESH_MS,
  isStoredTimestampOlderThan,
  SUNO_SNAPSHOT_REFRESH_MS,
} from './cacheRefreshPolicy';

test('isStoredTimestampOlderThan treats missing timestamps as stale', () => {
  const now = Date.parse('2026-07-12T12:00:00.000Z');
  assert.equal(isStoredTimestampOlderThan(null, SUNO_SNAPSHOT_REFRESH_MS, now), true);
});

test('isStoredTimestampOlderThan parses sqlite datetime strings', () => {
  const now = Date.parse('2026-07-12T12:00:00.000Z');
  assert.equal(
    isStoredTimestampOlderThan('2026-07-01 12:00:00', SUNO_SNAPSHOT_REFRESH_MS, now),
    true,
  );
  assert.equal(
    isStoredTimestampOlderThan('2026-07-10 12:00:00', SUNO_SNAPSHOT_REFRESH_MS, now),
    false,
  );
});

test('catalog auto refresh window is thirty days', () => {
  assert.equal(CATALOG_AUTO_REFRESH_MS, 30 * 24 * 60 * 60 * 1000);
});
