import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createEmptyDetourState,
  resolveTrackEndAdvance,
  setPrimaryContext,
} from './playbackDetours';

test('resolveTrackEndAdvance resumes interrupt after play-now ends', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.interrupt = { returnSongId: 20, returnArtistId: 1, returnPositionSeconds: 90 };
  state.activeRole = 'play-now';

  assert.deepEqual(
    resolveTrackEndAdvance({ state, repeatMode: 'off', currentSongId: 99 }),
    { type: 'resume-interrupt' },
  );
});

test('resolveTrackEndAdvance plays on-deck before repeat-one on primary', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.onDeck = { songId: 40, artistId: 2, songTitle: 'B4', playlistName: 'Playlist B' };
  state.activeRole = 'primary';

  assert.deepEqual(
    resolveTrackEndAdvance({ state, repeatMode: 'one', currentSongId: 20 }),
    { type: 'play-on-deck', songId: 40 },
  );
});

test('resolveTrackEndAdvance repeats primary anchor after on-deck when repeat one', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.activeRole = 'on-deck';

  assert.deepEqual(
    resolveTrackEndAdvance({ state, repeatMode: 'one', currentSongId: 40 }),
    { type: 'repeat-primary-anchor', songId: 20 },
  );
});

test('resolveTrackEndAdvance advances primary playlist after on-deck', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.primary!.consumedSongIds = [40];
  state.activeRole = 'on-deck';

  assert.deepEqual(
    resolveTrackEndAdvance({ state, repeatMode: 'off', currentSongId: 40 }),
    { type: 'advance-primary', anchorSongId: 20, consumedSongIds: [40] },
  );
});

test('resolveTrackEndAdvance advances from current primary track', () => {
  const state = createEmptyDetourState();
  setPrimaryContext(state, 1, 20);
  state.activeRole = 'primary';

  assert.deepEqual(
    resolveTrackEndAdvance({ state, repeatMode: 'off', currentSongId: 20 }),
    { type: 'advance-primary', anchorSongId: 20, consumedSongIds: [] },
  );
});
