import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ensureMirrorElementFeedsGraph,
  mirrorElementBlocksWebAudio,
} from './mirrorElement.ts';

test('mirrorElementBlocksWebAudio when muted or volume zero', () => {
  assert.equal(mirrorElementBlocksWebAudio({ muted: true, volume: 1 }), true);
  assert.equal(mirrorElementBlocksWebAudio({ muted: false, volume: 0 }), true);
  assert.equal(mirrorElementBlocksWebAudio({ muted: false, volume: 0.5 }), false);
});

test('ensureMirrorElementFeedsGraph clears muted and zero volume', () => {
  const audio = {
    muted: true,
    volume: 0,
  } as HTMLAudioElement;

  ensureMirrorElementFeedsGraph(audio);

  assert.equal(audio.muted, false);
  assert.equal(audio.volume, 1);
});

test('ensureMirrorElementFeedsGraph leaves healthy element unchanged', () => {
  const audio = {
    muted: false,
    volume: 0.85,
  } as HTMLAudioElement;

  ensureMirrorElementFeedsGraph(audio);

  assert.equal(audio.muted, false);
  assert.equal(audio.volume, 0.85);
});
