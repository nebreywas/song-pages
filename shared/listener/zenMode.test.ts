import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  pickZenSilenceSeconds,
  shouldStartZenInterlude,
  ZEN_MAX_SILENCE_SECONDS,
  ZEN_MIN_SILENCE_SECONDS,
} from './zenMode';

test('pickZenSilenceSeconds includes both range endpoints', () => {
  assert.equal(pickZenSilenceSeconds(() => 0), ZEN_MIN_SILENCE_SECONDS);
  assert.equal(pickZenSilenceSeconds(() => 0.999999), ZEN_MAX_SILENCE_SECONDS);
});

test('shouldStartZenInterlude fires every three completed songs', () => {
  assert.equal(shouldStartZenInterlude(0), false);
  assert.equal(shouldStartZenInterlude(1), false);
  assert.equal(shouldStartZenInterlude(2), false);
  assert.equal(shouldStartZenInterlude(3), true);
  assert.equal(shouldStartZenInterlude(4), false);
  assert.equal(shouldStartZenInterlude(6), true);
});
