import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PlaybackSnapshot } from '@shared/playback';
import { createEmptyDetourState } from '@shared/playback/detours/state';

import { buildCommandRuntimeContextFromSnapshot } from './buildCommandRuntimeContextFromSnapshot.ts';
import { buildVcStateFromSnapshot } from './buildVcStateFromSnapshot.ts';

function sampleSnapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return {
    activeTrackId: 1,
    playbackPhase: 'playing',
    repeatMode: 'off',
    shuffle: false,
    currentTime: 42,
    duration: 180,
    detours: createEmptyDetourState(),
    vcActive: true,
    playLockEnabled: true,
    playLockReleaseOnNext: false,
    mediaSource: 'hls',
    ...overrides,
  };
}

const songs = [
  { id: 1, title: 'One', artist_name: 'A' },
  { id: 2, title: 'Two', artist_name: 'B' },
  { id: 3, title: 'Three', artist_name: 'C' },
];

test('buildVcStateFromSnapshot maps timing and play lock from snapshot', () => {
  const projected = buildVcStateFromSnapshot({
    snapshot: sampleSnapshot(),
    sortedSongs: songs,
    queueAnchorSongId: 1,
    upcomingMax: 2,
    specialPlayPauseCountdown: null,
  });

  assert.deepEqual(projected.playback, { currentTime: 42, duration: 180, isPlaying: true });
  assert.equal(projected.playLockEnabled, true);
  assert.equal(projected.playLockReleaseOnNextSong, false);
  assert.equal(projected.nextSong?.title, 'Two');
  assert.equal(projected.upcoming.length, 2);
});

test('buildVcStateFromSnapshot exposes special pause only while waiting-for-host', () => {
  const waiting = buildVcStateFromSnapshot({
    snapshot: sampleSnapshot({ playbackPhase: 'waiting-for-host' }),
    sortedSongs: songs,
    queueAnchorSongId: 1,
    upcomingMax: 1,
    specialPlayPauseCountdown: {
      active: true,
      endsAt: 1_000_000,
      secondsRemaining: 30,
    },
  });
  assert.equal(waiting.specialPlayPause?.secondsRemaining, 30);

  const playing = buildVcStateFromSnapshot({
    snapshot: sampleSnapshot({ playbackPhase: 'playing' }),
    sortedSongs: songs,
    queueAnchorSongId: 1,
    upcomingMax: 1,
    specialPlayPauseCountdown: {
      active: true,
      endsAt: 1_000_000,
      secondsRemaining: 30,
    },
  });
  assert.equal(playing.specialPlayPause, null);
});

test('buildCommandRuntimeContextFromSnapshot derives queue and pause flags', () => {
  const context = buildCommandRuntimeContextFromSnapshot(
    sampleSnapshot({ playbackPhase: 'waiting-for-host' }),
    {
      sortedSongs: songs,
      queueAnchorSongId: 1,
      hasCurrentSong: true,
      hasCoverArt: true,
      hasHostGraphic: false,
      upcomingMax: 2,
    },
    { vcModeActive: true },
  );

  assert.equal(context.hasNextSong, true);
  assert.equal(context.hasUpcomingSongs, true);
  assert.equal(context.specialPlayPauseActive, true);
  assert.equal(context.playLockActive, true);
});
