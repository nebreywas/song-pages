import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_VC_WAVESURFER_PRESENTATION,
  isWavesurferDecodableUrl,
  normalizeWavesurferViewMode,
  resolveWavesurferPresentation,
} from './wavesurferSettings';

test('normalizeWavesurferViewMode accepts known modes only', () => {
  assert.equal(normalizeWavesurferViewMode('barwave'), 'barwave');
  assert.equal(normalizeWavesurferViewMode('nope'), null);
});

test('resolveWavesurferPresentation defaults then clamps bar knobs', () => {
  assert.deepEqual(resolveWavesurferPresentation({}), DEFAULT_VC_WAVESURFER_PRESENTATION);
  const next = resolveWavesurferPresentation({
    wavesurferViewMode: 'barwave',
    wavesurferBarWidth: 99,
    wavesurferBarGap: -3,
    wavesurferPaintProgress: false,
  });
  assert.equal(next.viewMode, 'barwave');
  assert.equal(next.barWidth, 20);
  assert.equal(next.barGap, 0);
  assert.equal(next.paintProgress, false);
});

test('isWavesurferDecodableUrl rejects HLS and empty', () => {
  assert.equal(isWavesurferDecodableUrl('https://cdn.example/a.mp3'), true);
  assert.equal(isWavesurferDecodableUrl('https://cdn.example/stream.m3u8'), false);
  assert.equal(isWavesurferDecodableUrl(''), false);
});
