import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveInitialProjectionMode,
  resolveLiveProjectionMode,
} from './resolveProjectionMode';
import { projectorTitleForKind } from './titles';

test('projector titles are stable', () => {
  assert.equal(projectorTitleForKind('song-page'), 'Projector: Song Page');
  assert.equal(projectorTitleForKind('vc-mode'), 'Projector: VC Mode');
  assert.equal(projectorTitleForKind('visualizer'), 'Projector: Visualizer');
  assert.equal(projectorTitleForKind('video'), 'Projector: Video');
});

const youtubeSong = { playback_scope: 'youtube' as const, page_url: null, playback_url: null };
const audioSong = { playback_scope: 'hls' as const, page_url: null, playback_url: 'https://cdn.example.com/a.m3u8' };

test('resolveInitialProjectionMode prefers visualizer when embedded is active', () => {
  assert.equal(
    resolveInitialProjectionMode({
      embeddedVisualizerActive: true,
      playingSong: youtubeSong,
    }),
    'visualizer',
  );
});

test('resolveInitialProjectionMode picks video for YouTube songs', () => {
  assert.equal(
    resolveInitialProjectionMode({
      embeddedVisualizerActive: false,
      playingSong: youtubeSong,
    }),
    'video',
  );
});

test('resolveInitialProjectionMode defaults to song page', () => {
  assert.equal(
    resolveInitialProjectionMode({
      embeddedVisualizerActive: false,
      playingSong: audioSong,
    }),
    'page',
  );
  assert.equal(
    resolveInitialProjectionMode({
      embeddedVisualizerActive: false,
      playingSong: null,
    }),
    'page',
  );
});

test('resolveLiveProjectionMode keeps sticky visualizer', () => {
  assert.equal(
    resolveLiveProjectionMode({
      stickyVisualizer: true,
      playingSong: youtubeSong,
    }),
    'visualizer',
  );
});

test('resolveLiveProjectionMode switches page and video with the track', () => {
  assert.equal(
    resolveLiveProjectionMode({
      stickyVisualizer: false,
      playingSong: youtubeSong,
    }),
    'video',
  );
  assert.equal(
    resolveLiveProjectionMode({
      stickyVisualizer: false,
      playingSong: null,
    }),
    'page',
  );
});
