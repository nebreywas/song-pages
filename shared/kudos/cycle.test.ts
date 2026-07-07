import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextKudoCycleIndex, kudoPresetAtCycleIndex } from './cycle';
import { migrateKudosState } from './migrate';
import type { KudoPreset } from './types';

const samplePresets: KudoPreset[] = [
  { id: 'a', name: 'A', contentType: 'builtin-assets', particle: undefined },
  { id: 'b', name: 'B', contentType: 'builtin-assets', particle: undefined },
  { id: 'c', name: 'C', contentType: 'builtin-assets', particle: undefined },
];

test('nextKudoCycleIndex wraps in preset list order', () => {
  assert.equal(nextKudoCycleIndex(samplePresets, 0), 1);
  assert.equal(nextKudoCycleIndex(samplePresets, 2), 0);
  assert.equal(nextKudoCycleIndex([], 0), null);
});

test('kudoPresetAtCycleIndex returns preset at index', () => {
  assert.equal(kudoPresetAtCycleIndex(samplePresets, 1)?.id, 'b');
  assert.equal(kudoPresetAtCycleIndex(samplePresets, 9), null);
});

test('migrateKudosState seeds starters when empty', () => {
  const state = migrateKudosState(null);
  assert.ok(state.presets.length >= 1);
  assert.equal(state.presets[0]?.name, 'Hearts Rise');
});
