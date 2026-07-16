import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isVcPlayLockBlocking,
  isVcPlayLockBlockingSongRemoval,
  shouldReleasePlayLockOnNaturalAdvance,
} from './playLock.ts';

test('play lock off never blocks', () => {
  assert.equal(
    isVcPlayLockBlocking(false, 'next', { playingSongId: 1 }),
    false,
  );
  assert.equal(
    isVcPlayLockBlocking(false, 'change-song', { playingSongId: 1, targetSongId: 2 }),
    false,
  );
});

test('play lock blocks manual transport and song changes while a track is playing', () => {
  const playing = { playingSongId: 10 };

  assert.equal(isVcPlayLockBlocking(true, 'prev', playing), true);
  assert.equal(isVcPlayLockBlocking(true, 'next', playing), true);
  assert.equal(isVcPlayLockBlocking(true, 'play-now', playing), true);
  assert.equal(isVcPlayLockBlocking(true, 'on-deck', playing), true);
  assert.equal(isVcPlayLockBlocking(true, 'play-next-song', playing), true);
  assert.equal(isVcPlayLockBlocking(true, 'playlist-double-click', playing), true);

  assert.equal(
    isVcPlayLockBlocking(true, 'change-song', { playingSongId: 10, targetSongId: 11 }),
    true,
  );
  assert.equal(
    isVcPlayLockBlocking(true, 'change-song', { playingSongId: 10, targetSongId: 10 }),
    false,
  );
});

test('row double-click uses playlist-double-click gate (blocks restart of current track)', () => {
  const playing = { playingSongId: 10 };
  assert.equal(isVcPlayLockBlocking(true, 'playlist-double-click', playing), true);
});

test('play lock blocks idle playback starts', () => {
  assert.equal(
    isVcPlayLockBlocking(true, 'start-idle-playback', { playingSongId: null }),
    true,
  );
  assert.equal(
    isVcPlayLockBlocking(true, 'start-idle-playback', { playingSongId: 5 }),
    false,
  );
});

test('play lock blocks removing the currently playing song only', () => {
  assert.equal(isVcPlayLockBlockingSongRemoval(true, 7, 7), true);
  assert.equal(isVcPlayLockBlockingSongRemoval(true, 7, 8), false);
  assert.equal(isVcPlayLockBlockingSongRemoval(false, 7, 7), false);
});

test('release on next song fires only for natural advances', () => {
  assert.equal(shouldReleasePlayLockOnNaturalAdvance('advance-primary'), true);
  assert.equal(shouldReleasePlayLockOnNaturalAdvance('play-on-deck'), true);
  assert.equal(shouldReleasePlayLockOnNaturalAdvance('repeat-current'), false);
  assert.equal(shouldReleasePlayLockOnNaturalAdvance('stop'), false);
});
