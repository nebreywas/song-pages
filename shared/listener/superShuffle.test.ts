import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  mergeSuperShufflePool,
  pickSuperShuffleEntry,
  type SuperShuffleEntry,
} from './superShuffle';

test('mergeSuperShufflePool dedupes by song id and skips unavailable/skipped', () => {
  const pool = mergeSuperShufflePool([
    {
      playlistId: 1,
      songs: [
        { id: 10 },
        { id: 11, skipped: 1 },
        { id: 12, unavailable: true },
      ],
    },
    {
      playlistId: 2,
      songs: [
        { id: 10 }, // duplicate — first playlist keeps ownership
        { id: 13 },
      ],
    },
  ]);

  assert.deepEqual(
    pool.map((entry) => [entry.song.id, entry.playlistId]),
    [
      [10, 1],
      [13, 2],
    ],
  );
});

test('mergeSuperShufflePool honors excludeSongIds', () => {
  const pool = mergeSuperShufflePool(
    [{ playlistId: 1, songs: [{ id: 1 }, { id: 2 }] }],
    { excludeSongIds: new Set([1]) },
  );
  assert.deepEqual(
    pool.map((entry) => entry.song.id),
    [2],
  );
});

test('pickSuperShuffleEntry avoids current song when alternatives exist', () => {
  const pool: SuperShuffleEntry[] = [
    { song: { id: 1 }, playlistId: 10 },
    { song: { id: 2 }, playlistId: 20 },
  ];
  const pick = pickSuperShuffleEntry(pool, {
    currentSongId: 1,
    // plain-random + fixed RNG keeps the assertion deterministic
    shuffleStrategy: 'plain-random',
    random: () => 0,
  });
  assert.equal(pick?.song.id, 2);
  assert.equal(pick?.playlistId, 20);
});

test('pickSuperShuffleEntry falls back to sole song when it is current', () => {
  const pool: SuperShuffleEntry[] = [{ song: { id: 7 }, playlistId: 3 }];
  const pick = pickSuperShuffleEntry(pool, {
    currentSongId: 7,
    shuffleStrategy: 'plain-random',
    random: () => 0,
  });
  assert.equal(pick?.song.id, 7);
});

test('pickSuperShuffleEntry returns null for empty pool', () => {
  assert.equal(pickSuperShuffleEntry([], { currentSongId: 1 }), null);
});

test('pickSuperShuffleEntry shuffle-bag covers the pool once before repeats', () => {
  const pool: SuperShuffleEntry[] = [
    { song: { id: 1 }, playlistId: 10 },
    { song: { id: 2 }, playlistId: 20 },
    { song: { id: 3 }, playlistId: 30 },
  ];
  const bag = { scopeKey: '', remainingIds: [] as number[], exhausted: false };
  const identityRandom = () => 0.999999;
  const seen: number[] = [];
  let current: number | null = null;

  for (let i = 0; i < 3; i += 1) {
    const pick = pickSuperShuffleEntry(pool, {
      currentSongId: current,
      shuffleBag: bag,
      shuffleStrategy: 'shuffle-bag',
      random: identityRandom,
    });
    assert.ok(pick);
    seen.push(pick!.song.id);
    current = pick!.song.id;
  }

  assert.deepEqual(seen, [1, 2, 3]);
});