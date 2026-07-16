import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clampPlaybackRateHold,
  easePlaybackRate,
  isPlaybackRateHoldActive,
  lerpPlaybackRate,
  PLAYBACK_RATE_HOLD_DEFAULT,
  PLAYBACK_RATE_HOLD_MAX,
  PLAYBACK_RATE_HOLD_MIN,
} from '../playbackRate.ts';
import { performanceEffectRestoreMs } from './types.ts';
import { rateBurstKindFromEffectId, rateBurstTotalMs } from './rateBurst.ts';

test('clampPlaybackRateHold keeps DJ fun range', () => {
  assert.equal(clampPlaybackRateHold(1), PLAYBACK_RATE_HOLD_DEFAULT);
  assert.equal(clampPlaybackRateHold(0.1), PLAYBACK_RATE_HOLD_MIN);
  assert.equal(clampPlaybackRateHold(9), PLAYBACK_RATE_HOLD_MAX);
  assert.equal(clampPlaybackRateHold('nope'), PLAYBACK_RATE_HOLD_DEFAULT);
});

test('isPlaybackRateHoldActive ignores tiny drift around 1', () => {
  assert.equal(isPlaybackRateHoldActive(1), false);
  assert.equal(isPlaybackRateHoldActive(0.85), true);
  assert.equal(isPlaybackRateHoldActive(1.2), true);
});

test('easePlaybackRate endpoints stay 0→1', () => {
  for (const easing of ['linear', 'ease-out', 'ease-in-out'] as const) {
    assert.equal(easePlaybackRate(0, easing), 0);
    assert.equal(easePlaybackRate(1, easing), 1);
  }
  assert.ok(easePlaybackRate(0.5, 'ease-in-out') > 0.4);
  assert.ok(easePlaybackRate(0.5, 'ease-out') > 0.7);
});

test('lerpPlaybackRate interpolates', () => {
  assert.equal(lerpPlaybackRate(1, 0.7, 0), 1);
  assert.equal(lerpPlaybackRate(1, 0.7, 1), 0.7);
  assert.ok(Math.abs(lerpPlaybackRate(1, 0.7, 0.5) - 0.85) < 1e-9);
});

test('rate burst ids map and timing matches restore windows', () => {
  assert.equal(rateBurstKindFromEffectId('rate-dive'), 'dive');
  assert.equal(rateBurstKindFromEffectId('rate-climb'), 'climb');
  assert.equal(rateBurstKindFromEffectId('reverb-throw'), null);
  assert.equal(performanceEffectRestoreMs('rate-dive'), rateBurstTotalMs('dive'));
  assert.equal(performanceEffectRestoreMs('rate-climb'), rateBurstTotalMs('climb'));
});
