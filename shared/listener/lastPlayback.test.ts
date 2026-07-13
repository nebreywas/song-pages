import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildLastPlaybackState,
  normalizeListenerLastPlayback,
} from './lastPlayback';

test('normalizeListenerLastPlayback accepts valid persisted state', () => {
  assert.deepEqual(normalizeListenerLastPlayback({ artistId: 0, songId: 42 }), {
    artistId: 0,
    songId: 42,
  });
});

test('normalizeListenerLastPlayback rejects invalid values', () => {
  assert.equal(normalizeListenerLastPlayback(null), null);
  assert.equal(normalizeListenerLastPlayback({ artistId: 'x', songId: 1 }), null);
  assert.equal(normalizeListenerLastPlayback({ artistId: 1 }), null);
});

test('buildLastPlaybackState truncates numeric ids', () => {
  assert.deepEqual(buildLastPlaybackState(1.9, 2.1), { artistId: 1, songId: 2 });
});
