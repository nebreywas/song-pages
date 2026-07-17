import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decideMinifyEdgeAction,
  decideMiniPlayerComplianceAction,
  findNextNonYoutubeSong,
  hasNonYoutubeSong,
  resolveEffectiveMiniBehavior,
  type MiniComplianceInputs,
  type MinifyEdgeInputs,
} from './youtubeMiniCompliance';

// isYoutubeSong treats playback_scope === 'youtube' as a YouTube song.
const yt = (id: number) => ({ id, playback_scope: 'youtube' as const });
const local = (id: number) => ({ id, playback_scope: 'catalog' as const });

// --- hasNonYoutubeSong -----------------------------------------------------

test('hasNonYoutubeSong is false for an all-YouTube playlist', () => {
  assert.equal(hasNonYoutubeSong([yt(1), yt(2)]), false);
});

test('hasNonYoutubeSong is true when any non-YouTube song exists', () => {
  assert.equal(hasNonYoutubeSong([yt(1), local(2)]), true);
  assert.equal(hasNonYoutubeSong([]), false);
});

// --- findNextNonYoutubeSong ------------------------------------------------

test('findNextNonYoutubeSong finds the next non-YouTube song after current', () => {
  const songs = [yt(1), yt(2), local(3), local(4)];
  assert.equal(findNextNonYoutubeSong(songs, 1)?.id, 3);
});

test('findNextNonYoutubeSong wraps around past the end', () => {
  const songs = [local(1), yt(2), yt(3)];
  assert.equal(findNextNonYoutubeSong(songs, 3)?.id, 1);
});

test('findNextNonYoutubeSong skips the current track even if non-YouTube', () => {
  const songs = [local(1), yt(2)];
  // Starting on the only non-YouTube song, there is nowhere else to land.
  assert.equal(findNextNonYoutubeSong(songs, 1), null);
});

test('findNextNonYoutubeSong returns null for an all-YouTube playlist', () => {
  assert.equal(findNextNonYoutubeSong([yt(1), yt(2)], 1), null);
});

test('findNextNonYoutubeSong starts from the top when current is not present', () => {
  const songs = [yt(1), local(2)];
  assert.equal(findNextNonYoutubeSong(songs, null)?.id, 2);
  assert.equal(findNextNonYoutubeSong([], 1), null);
});

// --- resolveEffectiveMiniBehavior ------------------------------------------

test('resolveEffectiveMiniBehavior downgrades skip to projector on an all-YouTube playlist', () => {
  assert.equal(resolveEffectiveMiniBehavior('skip', false), 'projector');
});

test('resolveEffectiveMiniBehavior keeps skip when a non-YouTube song exists', () => {
  assert.equal(resolveEffectiveMiniBehavior('skip', true), 'skip');
});

test('resolveEffectiveMiniBehavior passes projector and expand through unchanged', () => {
  assert.equal(resolveEffectiveMiniBehavior('projector', false), 'projector');
  assert.equal(resolveEffectiveMiniBehavior('expand', false), 'expand');
  assert.equal(resolveEffectiveMiniBehavior('expand', true), 'expand');
});

// --- decideMinifyEdgeAction ------------------------------------------------

const minifyEdge = (overrides: Partial<MinifyEdgeInputs> = {}): MinifyEdgeInputs => ({
  behavior: 'projector',
  playingIsYoutube: false,
  hasPlayingSong: false,
  mainPaneWidgetPlaying: false,
  mainContentIsSong: false,
  showingYoutubePage: false,
  youtubeRemoteCaptureActive: false,
  hasActiveSongPage: false,
  activeSongPageIsPlayingTrack: false,
  ...overrides,
});

test('decideMinifyEdgeAction restarts the current YouTube track under projector', () => {
  assert.equal(
    decideMinifyEdgeAction(minifyEdge({ behavior: 'projector', playingIsYoutube: true, hasPlayingSong: true })),
    'restart-current',
  );
});

test('decideMinifyEdgeAction does not restart for expand/skip (they act in steady state)', () => {
  assert.equal(
    decideMinifyEdgeAction(minifyEdge({ behavior: 'expand', playingIsYoutube: true, hasPlayingSong: true })),
    'none',
  );
  assert.equal(
    decideMinifyEdgeAction(minifyEdge({ behavior: 'skip', playingIsYoutube: true, hasPlayingSong: true })),
    'none',
  );
});

test('decideMinifyEdgeAction promotes a playing browse-preview YouTube video', () => {
  assert.equal(
    decideMinifyEdgeAction(
      minifyEdge({
        playingIsYoutube: false,
        mainPaneWidgetPlaying: true,
        mainContentIsSong: true,
        showingYoutubePage: true,
        hasActiveSongPage: true,
        activeSongPageIsPlayingTrack: false,
      }),
    ),
    'promote-preview',
  );
});

test('decideMinifyEdgeAction does not promote a paused preview or a remote-captured embed', () => {
  const base = {
    playingIsYoutube: false,
    mainContentIsSong: true,
    showingYoutubePage: true,
    hasActiveSongPage: true,
    activeSongPageIsPlayingTrack: false,
  };
  // Paused preview.
  assert.equal(decideMinifyEdgeAction(minifyEdge({ ...base, mainPaneWidgetPlaying: false })), 'none');
  // Playing, but a remote surface already owns/shows the embed.
  assert.equal(
    decideMinifyEdgeAction(minifyEdge({ ...base, mainPaneWidgetPlaying: true, youtubeRemoteCaptureActive: true })),
    'none',
  );
  // Preview is already the now-playing track — Case A would have handled it.
  assert.equal(
    decideMinifyEdgeAction(minifyEdge({ ...base, mainPaneWidgetPlaying: true, activeSongPageIsPlayingTrack: true })),
    'none',
  );
});

// --- decideMiniPlayerComplianceAction --------------------------------------

const miniState = (overrides: Partial<MiniComplianceInputs> = {}): MiniComplianceInputs => ({
  behavior: 'projector',
  chromeMinified: true,
  playingIsYoutube: true,
  isPlaying: true,
  projectorState: 'idle',
  projectorWindowOpen: false,
  autoExpanded: false,
  ...overrides,
});

test('skip: advances to next when minified over a playing YouTube track', () => {
  const decision = decideMiniPlayerComplianceAction(miniState({ behavior: 'skip' }));
  assert.deepEqual(decision.action, { type: 'skip-to-next' });
});

test('skip: does nothing when the track is paused', () => {
  const decision = decideMiniPlayerComplianceAction(miniState({ behavior: 'skip', isPlaying: false }));
  assert.deepEqual(decision.action, { type: 'none' });
});

test('expand: leaves mini-player once, then restores when the YouTube track is gone', () => {
  const expanded = decideMiniPlayerComplianceAction(miniState({ behavior: 'expand' }));
  assert.deepEqual(expanded.action, { type: 'expand-player' });
  assert.equal(expanded.autoExpanded, true);

  // Already expanded + still YouTube → no repeated flip.
  const stable = decideMiniPlayerComplianceAction(miniState({ behavior: 'expand', autoExpanded: true }));
  assert.deepEqual(stable.action, { type: 'none' });

  // Track no longer YouTube while we auto-expanded → restore mini-player.
  const restored = decideMiniPlayerComplianceAction(
    miniState({ behavior: 'expand', autoExpanded: true, playingIsYoutube: false }),
  );
  assert.deepEqual(restored.action, { type: 'restore-mini-player' });
  assert.equal(restored.autoExpanded, false);
});

test('projector: opens the compliance window from idle when playing', () => {
  const decision = decideMiniPlayerComplianceAction(miniState({ projectorState: 'idle' }));
  assert.deepEqual(decision.action, { type: 'open-projector' });
  assert.equal(decision.projectorState, 'opening');
});

test('projector: does not open while paused', () => {
  const decision = decideMiniPlayerComplianceAction(miniState({ projectorState: 'idle', isPlaying: false }));
  assert.deepEqual(decision.action, { type: 'none' });
  assert.equal(decision.projectorState, 'idle');
});

test('projector: opening → open once the window is confirmed up', () => {
  const decision = decideMiniPlayerComplianceAction(
    miniState({ projectorState: 'opening', projectorWindowOpen: true }),
  );
  assert.deepEqual(decision.action, { type: 'none' });
  assert.equal(decision.projectorState, 'open');
});

test('projector: user-closed window while still minified+playing skips to next', () => {
  const decision = decideMiniPlayerComplianceAction(
    miniState({ projectorState: 'open', projectorWindowOpen: false }),
  );
  assert.deepEqual(decision.action, { type: 'skip-projector-closed' });
  assert.equal(decision.projectorState, 'idle');
});

test('projector: window closed while paused resets state without skipping', () => {
  const decision = decideMiniPlayerComplianceAction(
    miniState({ projectorState: 'open', projectorWindowOpen: false, isPlaying: false }),
  );
  assert.deepEqual(decision.action, { type: 'none' });
  assert.equal(decision.projectorState, 'idle');
});

test('projector: closes our window when no longer minified over a YouTube video', () => {
  const decision = decideMiniPlayerComplianceAction(
    miniState({ projectorState: 'open', projectorWindowOpen: true, playingIsYoutube: false }),
  );
  assert.deepEqual(decision.action, { type: 'close-projector' });
  assert.equal(decision.projectorState, 'idle');
});

test('projector: tears down state without a close call if the window is already gone', () => {
  const decision = decideMiniPlayerComplianceAction(
    miniState({ projectorState: 'open', projectorWindowOpen: false, chromeMinified: false }),
  );
  assert.deepEqual(decision.action, { type: 'none' });
  assert.equal(decision.projectorState, 'idle');
});
