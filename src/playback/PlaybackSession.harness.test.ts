import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPlaybackSessionForTest } from './testing/createPlaybackSessionForTest.ts';

test('B2 NEXT with shuffle off queues second track', () => {
  const { session, flushEffects } = createPlaybackSessionForTest({
    songs: [{ id: 1 }, { id: 2 }, { id: 3 }],
    queueAnchorSongId: 1,
  });

  session.syncTransport({
    activeTrackId: 1,
    isPlaying: true,
    waitingForHost: false,
    currentTime: 0,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 1,
  });

  session.dispatch({ type: 'NEXT', source: 'player-ui' });
  const effects = flushEffects();
  assert.equal(effects.length, 1);
  assert.deepEqual(effects[0], {
    type: 'manual-next',
    action: { type: 'play-queue-track', songId: 2, restartIfSameSong: false },
  });
});

test('B3 NEXT rejected when play lock on', () => {
  const { session, flushEffects } = createPlaybackSessionForTest({
    songs: [{ id: 1 }, { id: 2 }],
    queueAnchorSongId: 1,
  });

  session.syncTransport({
    activeTrackId: 1,
    isPlaying: true,
    waitingForHost: false,
    currentTime: 0,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 1,
  });
  session.syncVcPolicy({ vcActive: true, playLockEnabled: true, playLockReleaseOnNext: false });

  const result = session.dispatch({ type: 'NEXT', source: 'player-ui' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'play-lock');
  assert.equal(flushEffects().length, 0);
  assert.equal(session.getSnapshot().activeTrackId, 1);
});

test('B4 track end repeat-all advances primary from current id', () => {
  const { session, flushEffects } = createPlaybackSessionForTest({
    songs: [{ id: 1 }, { id: 2 }],
    queueAnchorSongId: 2,
    initialRepeatMode: 'all',
  });

  session.beginPrimaryPlayback(1, 2);
  session.syncTransport({
    activeTrackId: 2,
    isPlaying: true,
    waitingForHost: false,
    currentTime: 170,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 2,
  });

  session.handleTrackEnded(2);
  const effects = flushEffects();
  assert.ok(effects.some((e) => e.type === 'track-end' && e.action.type === 'advance-primary'));
});

test('B5 play-now role track end resumes interrupt', () => {
  const { session, flushEffects } = createPlaybackSessionForTest();
  session.beginPrimaryPlayback(1, 20);
  session.setInterrupt({ returnSongId: 20, returnArtistId: 1, returnPositionSeconds: 90 });
  session.setDetourRole('play-now');
  session.syncTransport({
    activeTrackId: 99,
    isPlaying: true,
    waitingForHost: false,
    currentTime: 30,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 99,
  });

  session.handleTrackEnded(99);
  const effects = flushEffects();
  assert.deepEqual(effects[0], { type: 'track-end', action: { type: 'resume-interrupt' } });
});

test('B6 primary track end plays on-deck when queued', () => {
  const { session, flushEffects } = createPlaybackSessionForTest();
  session.beginPrimaryPlayback(1, 20);
  session.setOnDeck({
    songId: 40,
    artistId: 2,
    songTitle: 'Deck',
    playlistName: 'Other',
  });
  session.syncTransport({
    activeTrackId: 20,
    isPlaying: true,
    waitingForHost: false,
    currentTime: 180,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 20,
  });

  session.handleTrackEnded(20);
  const effects = flushEffects();
  assert.deepEqual(effects[0], {
    type: 'track-end',
    action: { type: 'play-on-deck', songId: 40 },
  });
});

test('B10 vc exit clears play lock in snapshot', () => {
  const { session } = createPlaybackSessionForTest();
  session.syncVcPolicy({ vcActive: true, playLockEnabled: true, playLockReleaseOnNext: true });
  assert.equal(session.getSnapshot().playLockEnabled, true);

  session.syncVcPolicy({ vcActive: false, playLockEnabled: true, playLockReleaseOnNext: true });
  const snapshot = session.getSnapshot();
  assert.equal(snapshot.playLockEnabled, false);
  assert.equal(snapshot.playLockReleaseOnNext, false);
});

test('B9 NEXT rejected while waiting-for-host; RESUME_AFTER_WAIT emits effect', () => {
  const { session, flushEffects } = createPlaybackSessionForTest({
    songs: [{ id: 1 }, { id: 2 }],
    queueAnchorSongId: 1,
  });

  session.syncVcPolicy({ vcActive: true, playLockEnabled: false, playLockReleaseOnNext: false });
  session.syncTransport({
    activeTrackId: 1,
    isPlaying: false,
    waitingForHost: true,
    currentTime: 180,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 1,
  });

  const nextResult = session.dispatch({ type: 'NEXT', source: 'vc-surface' });
  assert.equal(nextResult.ok, false);
  if (!nextResult.ok) assert.equal(nextResult.reason, 'waiting-for-host');
  assert.equal(flushEffects().length, 0);

  const resumeResult = session.dispatch({ type: 'RESUME_AFTER_WAIT', source: 'vc-surface' });
  assert.equal(resumeResult.ok, true);
  assert.deepEqual(flushEffects(), [{ type: 'resume-after-wait' }]);
});

test('B9 RESUME_AFTER_WAIT rejected when not waiting-for-host', () => {
  const { session, flushEffects } = createPlaybackSessionForTest();

  session.syncTransport({
    activeTrackId: 1,
    isPlaying: true,
    waitingForHost: false,
    currentTime: 30,
    duration: 180,
    mediaSource: 'hls',
    playingSongIdRef: 1,
  });

  const result = session.dispatch({ type: 'RESUME_AFTER_WAIT', source: 'keyboard' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'not-waiting-for-host');
  assert.equal(flushEffects().length, 0);
});

test('VOLUME_DELTA emits volume-delta effect', () => {
  const { session, flushEffects } = createPlaybackSessionForTest();

  session.dispatch({ type: 'VOLUME_DELTA', source: 'keyboard', delta: 0.05 });
  assert.deepEqual(flushEffects(), [{ type: 'volume-delta', delta: 0.05 }]);
});

test('applyPlayLockReleaseIfScheduled clears session flags', () => {
  const { session } = createPlaybackSessionForTest();
  session.syncVcPolicy({ vcActive: true, playLockEnabled: true, playLockReleaseOnNext: true });
  session.applyPlayLockReleaseIfScheduled();
  const snapshot = session.getSnapshot();
  assert.equal(snapshot.playLockEnabled, false);
  assert.equal(snapshot.playLockReleaseOnNext, false);
});

test('CYCLE_REPEAT updates session snapshot', () => {
  const { session } = createPlaybackSessionForTest();
  assert.equal(session.getSnapshot().repeatMode, 'off');
  session.dispatch({ type: 'CYCLE_REPEAT', source: 'player-ui' });
  assert.equal(session.getSnapshot().repeatMode, 'all');
});
