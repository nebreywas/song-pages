import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isNowPlayingLibraryEntry,
  isNowPlayingSong,
} from './nowPlayingGuards';

test('isNowPlayingSong matches transport song only', () => {
  assert.equal(isNowPlayingSong(12, 12), true);
  assert.equal(isNowPlayingSong(12, 99), false);
  assert.equal(isNowPlayingSong(null, 12), false);
});

test('isNowPlayingLibraryEntry requires an active transport song', () => {
  assert.equal(isNowPlayingLibraryEntry(5, 100, 100), true);
  assert.equal(isNowPlayingLibraryEntry(5, 100, 200), false);
  assert.equal(isNowPlayingLibraryEntry(null, 100, 100), false);
  assert.equal(isNowPlayingLibraryEntry(5, null, 100), false);
});
