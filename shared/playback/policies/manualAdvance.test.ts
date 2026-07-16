import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createEmptyDetourState,
  setPrimaryContext,
} from '../detours/state.ts';
import { resolveManualNext, resolveManualPrevious } from './manualAdvance.ts';

const songs = [{ id: 1 }, { id: 2 }, { id: 3 }];

test('resolveManualNext blocked when play lock on', () => {
  const state = createEmptyDetourState();
  assert.deepEqual(
    resolveManualNext({
      playLockEnabled: true,
      playingSongId: 1,
      playingSongIdRef: 1,
      state,
      queueAnchorSongId: 1,
      sortedSongs: songs,
      queueOptions: { shuffle: false, repeatMode: 'off' },
    }),
    { type: 'blocked' },
  );
});

test('resolveManualNext detour-failure for play-now role', () => {
  const state = createEmptyDetourState();
  state.activeRole = 'play-now';
  assert.deepEqual(
    resolveManualNext({
      playLockEnabled: false,
      playingSongId: 99,
      playingSongIdRef: 99,
      state,
      queueAnchorSongId: 1,
      sortedSongs: songs,
      queueOptions: { shuffle: false, repeatMode: 'off' },
    }),
    { type: 'detour-failure' },
  );
});

test('resolveManualNext advances primary from on-deck role', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.primary!.consumedSongIds = [40];
  state.activeRole = 'on-deck';

  assert.deepEqual(
    resolveManualNext({
      playLockEnabled: false,
      playingSongId: 40,
      playingSongIdRef: 40,
      state,
      queueAnchorSongId: 40,
      sortedSongs: songs,
      queueOptions: { shuffle: false, repeatMode: 'off' },
    }),
    { type: 'advance-primary', anchorSongId: 20, consumedSongIds: [40] },
  );
});

test('resolveManualNext plays on-deck when queued during primary', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.onDeck = { songId: 40, artistId: 2, songTitle: 'B', playlistName: 'P' };
  state.activeRole = 'primary';

  assert.deepEqual(
    resolveManualNext({
      playLockEnabled: false,
      playingSongId: 20,
      playingSongIdRef: 20,
      state,
      queueAnchorSongId: 20,
      sortedSongs: songs,
      queueOptions: { shuffle: false, repeatMode: 'off' },
    }),
    { type: 'play-on-deck', updateAnchorToSongId: 20 },
  );
});

test('resolveManualNext picks next queue track when no detour context', () => {
  const state = createEmptyDetourState();
  assert.deepEqual(
    resolveManualNext({
      playLockEnabled: false,
      playingSongId: 1,
      playingSongIdRef: 1,
      state,
      queueAnchorSongId: 1,
      sortedSongs: songs,
      queueOptions: { shuffle: false, repeatMode: 'off' },
    }),
    { type: 'play-queue-track', songId: 2, restartIfSameSong: false },
  );
});

test('resolveManualPrevious restarts detour tracks from start', () => {
  const state = createEmptyDetourState();
  state.activeRole = 'on-deck';
  assert.deepEqual(
    resolveManualPrevious({
      playLockEnabled: false,
      playingSongId: 5,
      state,
      queueAnchorSongId: 5,
      sortedSongs: songs,
      repeatMode: 'off',
    }),
    { type: 'restart-detour', role: 'on-deck' },
  );
});

test('resolveManualPrevious dismisses on-deck only when no previous track', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 1);
  state.onDeck = { songId: 40, artistId: 2, songTitle: 'B', playlistName: 'P' };
  state.activeRole = 'primary';

  assert.deepEqual(
    resolveManualPrevious({
      playLockEnabled: false,
      playingSongId: 1,
      state,
      queueAnchorSongId: 1,
      sortedSongs: [{ id: 1 }],
      repeatMode: 'off',
    }),
    { type: 'dismiss-on-deck-only' },
  );
});

test('resolveManualPrevious plays previous and dismisses on-deck first', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 2);
  state.onDeck = { songId: 40, artistId: 2, songTitle: 'B', playlistName: 'P' };
  state.activeRole = 'primary';

  assert.deepEqual(
    resolveManualPrevious({
      playLockEnabled: false,
      playingSongId: 2,
      state,
      queueAnchorSongId: 2,
      sortedSongs: songs,
      repeatMode: 'off',
    }),
    { type: 'play-queue-track', songId: 1, dismissOnDeckFirst: true },
  );
});
