import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  pickNextPlayableSongId,
  pickPreviousPlayableSongId,
  pickUpcomingPlayableSongIds,
  resolvePlayableSong,
} from '../playback/queue/planner.ts';

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

test('pickNextPlayableSongId repeat all wrap ignores detour-consumed rows', () => {
  const skipSongIds = new Set([1, 3]);
  assert.equal(
    pickNextPlayableSongId(songs, 5, { shuffle: false, repeatMode: 'all', skipSongIds }),
    1,
  );
});

test('pickNextPlayableSongId shuffle repeat all wraps from last song', () => {
  const result = pickNextPlayableSongId(songs, 5, { shuffle: true, repeatMode: 'all' });
  assert.ok(result === 1 || result === 3);
});

test('pickPreviousPlayableSongId wraps on repeat all', () => {
  assert.equal(
    pickPreviousPlayableSongId(songs, 1, { repeatMode: 'all' }),
    5,
  );
});

test('pickNextPlayableSongId returns current song on repeat one', () => {
  assert.equal(pickNextPlayableSongId(songs, 3, { shuffle: false, repeatMode: 'one' }), 3);
  assert.equal(pickNextPlayableSongId(songs, 5, { shuffle: false, repeatMode: 'one' }), 5);
});

test('pickUpcomingPlayableSongIds wraps on repeat all', () => {
  assert.deepEqual(
    pickUpcomingPlayableSongIds(songs, 5, 4, { shuffle: false, repeatMode: 'all' }),
    [1, 3, 5, 1],
  );
});

test('pickUpcomingPlayableSongIds repeats current song on repeat one', () => {
  assert.deepEqual(
    pickUpcomingPlayableSongIds(songs, 3, 3, { shuffle: false, repeatMode: 'one' }),
    [3, 3, 3],
  );
});

test('pickUpcomingPlayableSongIds stops at playlist end when repeat is off', () => {
  assert.deepEqual(
    pickUpcomingPlayableSongIds(songs, 3, 5, { shuffle: false, repeatMode: 'off' }),
    [5],
  );
});

test('pickPreviousPlayableSongId skips marked rows', () => {
  assert.equal(pickPreviousPlayableSongId(songs, 5), 3);
  assert.equal(pickPreviousPlayableSongId(songs, 3), 1);
  assert.equal(pickPreviousPlayableSongId(songs, 1), null);
});

test('resolvePlayableSong advances past a skipped request', () => {
  assert.equal(resolvePlayableSong(songs, songs[1]!)?.id, 3);
});

test('pickNextPlayableSongId skips session-only VC rows', () => {
  const sessionSkippedIds = new Set([3]);
  assert.equal(
    pickNextPlayableSongId(songs, 1, { shuffle: false, repeatMode: 'off', sessionSkippedIds }),
    5,
  );
});

test('pickNextPlayableSongId skips detour-consumed rows', () => {
  const skipSongIds = new Set([4]);
  assert.equal(
    pickNextPlayableSongId(songs, 3, { shuffle: false, repeatMode: 'off', skipSongIds }),
    5,
  );
});

test('pickNextPlayableSongId skips unavailable liked songs', () => {
  const likedSongs = [
    { id: 1, skipped: 0, unavailable: 0 },
    { id: 2, skipped: 0, unavailable: 1 },
    { id: 3, skipped: 0, unavailable: 0 },
  ];
  assert.equal(pickNextPlayableSongId(likedSongs, 1, { shuffle: false, repeatMode: 'off' }), 3);
});
