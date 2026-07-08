import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  pickNextPlayableSongId,
  pickPreviousPlayableSongId,
  resolvePlayableSong,
} from './playbackQueue.ts';

const songs = [
  { id: 1, skipped: 0 },
  { id: 2, skipped: 1 },
  { id: 3, skipped: 0 },
  { id: 4, skipped: 1 },
  { id: 5, skipped: 0 },
];

test('pickNextPlayableSongId skips marked rows', () => {
  assert.equal(pickNextPlayableSongId(songs, 1, { shuffle: false, repeatMode: 'off' }), 3);
  assert.equal(pickNextPlayableSongId(songs, 3, { shuffle: false, repeatMode: 'off' }), 5);
  assert.equal(pickNextPlayableSongId(songs, 5, { shuffle: false, repeatMode: 'off' }), null);
});

test('pickNextPlayableSongId wraps on repeat all', () => {
  assert.equal(pickNextPlayableSongId(songs, 5, { shuffle: false, repeatMode: 'all' }), 1);
});

test('pickPreviousPlayableSongId skips marked rows', () => {
  assert.equal(pickPreviousPlayableSongId(songs, 5), 3);
  assert.equal(pickPreviousPlayableSongId(songs, 3), 1);
  assert.equal(pickPreviousPlayableSongId(songs, 1), null);
});

test('resolvePlayableSong advances past a skipped request', () => {
  assert.equal(resolvePlayableSong(songs, songs[1]!)?.id, 3);
});
