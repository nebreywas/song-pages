import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BASS_GAIN_DB, LOFI_LOWPASS_HZ } from '../constants.ts';
import { resolvePlaybackEffectParams } from './buildGraph.ts';

test('resolvePlaybackEffectParams defaults to flat/neutral', () => {
  const params = resolvePlaybackEffectParams({ bassBoost: false, lofi: false });
  assert.equal(params.bassGainDb, 0);
  assert.equal(params.lofiLowpassHz, 22050);
  assert.equal(params.lofiDriveActive, false);
});

test('resolvePlaybackEffectParams applies bass boost', () => {
  const params = resolvePlaybackEffectParams({ bassBoost: true, lofi: false });
  assert.equal(params.bassGainDb, BASS_GAIN_DB);
});

test('resolvePlaybackEffectParams applies lo-fi', () => {
  const params = resolvePlaybackEffectParams({ bassBoost: false, lofi: true });
  assert.equal(params.lofiLowpassHz, LOFI_LOWPASS_HZ);
  assert.equal(params.lofiDriveActive, true);
});
