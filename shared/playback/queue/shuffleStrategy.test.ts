import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  commitShuffleBag,
  createEmptyShuffleBag,
  drawFromShuffleBag,
  drawShuffledSongId,
  pickPlainRandomSongId,
  refillShuffleBag,
  shuffleIds,
} from './shuffleStrategy';

test('shuffleIds is a permutation of the input', () => {
  const ids = [1, 2, 3, 4, 5];
  // Deterministic “random”: always swap toward lower indices in a fixed way.
  let n = 0;
  const random = () => {
    n += 1;
    return (n % 10) / 10;
  };
  const shuffled = shuffleIds(ids, random);
  assert.equal(shuffled.length, ids.length);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), ids);
});

test('shuffle-bag plays each id once before repeating', () => {
  const playable = [1, 2, 3, 4];
  const bag = createEmptyShuffleBag();
  // Keep Fisher–Yates as an identity permutation so draw order is stable.
  const identityRandom = () => 0.999999;
  const seen: number[] = [];
  let current: number | null = null;

  for (let i = 0; i < 4; i += 1) {
    const result = drawFromShuffleBag(playable, bag, {
      scopeKey: 'pl:1',
      currentSongId: current,
      repeatMode: 'all',
      random: identityRandom,
    });
    commitShuffleBag(bag, result.bag);
    assert.ok(result.songId != null);
    seen.push(result.songId!);
    current = result.songId!;
  }

  assert.deepEqual(seen, [1, 2, 3, 4]);
  assert.equal(bag.remainingIds.length, 0);

  // Second cycle refills excluding the track that just ended (4).
  const second = drawFromShuffleBag(playable, bag, {
    scopeKey: 'pl:1',
    currentSongId: current,
    repeatMode: 'all',
    random: identityRandom,
  });
  commitShuffleBag(bag, second.bag);
  assert.deepEqual(second.bag.remainingIds.length + 1, 3);
  assert.ok(second.songId != null && second.songId !== 4);
  assert.deepEqual(
    [second.songId!, ...second.bag.remainingIds].sort((a, b) => a - b),
    [1, 2, 3],
  );
});

test('shuffle-bag stops when empty and repeat is off', () => {
  const playable = [10, 20];
  const bag = createEmptyShuffleBag();
  const identityRandom = () => 0.999999;

  const first = drawFromShuffleBag(playable, bag, {
    scopeKey: 'pl:2',
    currentSongId: null,
    repeatMode: 'off',
    random: identityRandom,
  });
  commitShuffleBag(bag, first.bag);
  assert.equal(first.songId, 10);

  const second = drawFromShuffleBag(playable, bag, {
    scopeKey: 'pl:2',
    currentSongId: 10,
    repeatMode: 'off',
    random: identityRandom,
  });
  commitShuffleBag(bag, second.bag);
  assert.equal(second.songId, 20);

  const third = drawFromShuffleBag(playable, bag, {
    scopeKey: 'pl:2',
    currentSongId: 20,
    repeatMode: 'off',
    random: identityRandom,
  });
  assert.equal(third.songId, null);
});

test('scope change refills the bag', () => {
  const identityRandom = () => 0.999999;
  const bag = refillShuffleBag('pl:a', [1, 2, 3], { random: identityRandom });
  const result = drawFromShuffleBag([10, 20], bag, {
    scopeKey: 'pl:b',
    currentSongId: null,
    repeatMode: 'all',
    random: identityRandom,
  });
  assert.equal(result.songId, 10);
  assert.equal(result.bag.scopeKey, 'pl:b');
});

test('plain-random can repeat before exhausting the pool', () => {
  // Always pick candidates[0] — oscillates 2↔1 and never reaches 3.
  let current = 1;
  const picks: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const id = pickPlainRandomSongId([1, 2, 3], {
      currentSongId: current,
      repeatMode: 'all',
      random: () => 0,
    });
    assert.ok(id != null);
    picks.push(id!);
    current = id!;
  }
  assert.deepEqual(picks, [2, 1, 2]);
});

test('drawShuffledSongId routes plain-random without consuming the bag', () => {
  const identityRandom = () => 0.999999;
  const bag = refillShuffleBag('x', [1, 2, 3], { random: identityRandom });
  const before = bag.remainingIds.slice();
  const result = drawShuffledSongId('plain-random', [1, 2, 3], bag, {
    scopeKey: 'x',
    currentSongId: 1,
    repeatMode: 'all',
    random: () => 0,
  });
  assert.equal(result.songId, 2);
  assert.deepEqual(result.bag.remainingIds, before);
});
