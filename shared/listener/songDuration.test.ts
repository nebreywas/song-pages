import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isSongLongerThanMinutes, resolveSongDurationSeconds } from './songDuration';

test('resolveSongDurationSeconds prefers persisted duration', () => {
  assert.equal(resolveSongDurationSeconds({ id: 1, duration_seconds: 240 }, { 1: 999 }), 240);
  assert.equal(resolveSongDurationSeconds({ id: 1, duration_seconds: null }, { 1: 180 }), 180);
  assert.equal(resolveSongDurationSeconds({ id: 1 }, {}), null);
});

test('isSongLongerThanMinutes uses strict greater-than threshold', () => {
  assert.equal(isSongLongerThanMinutes({ duration_seconds: 8 * 60 }, 8), false);
  assert.equal(isSongLongerThanMinutes({ duration_seconds: 8 * 60 + 1 }, 8), true);
});
