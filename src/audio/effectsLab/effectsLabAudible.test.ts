import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_EFFECTS_LAB_STATE,
  isEffectsLabAudible,
  shouldBypassLabPreset,
} from './types.ts';

test('isEffectsLabAudible requires Activate for steady-state FX', () => {
  assert.equal(
    isEffectsLabAudible({ ...DEFAULT_EFFECTS_LAB_STATE, enabled: false, effectId: 'air' }),
    false,
  );
  assert.equal(
    isEffectsLabAudible({ ...DEFAULT_EFFECTS_LAB_STATE, enabled: true, effectId: 'air' }),
    true,
  );
});

test('hold A/B while Activate is off temporarily applies the selected preset', () => {
  assert.equal(
    isEffectsLabAudible({
      ...DEFAULT_EFFECTS_LAB_STATE,
      enabled: false,
      effectId: 'warm',
      abBypass: true,
    }),
    true,
  );
  assert.equal(
    shouldBypassLabPreset({
      ...DEFAULT_EFFECTS_LAB_STATE,
      enabled: false,
      effectId: 'warm',
      abBypass: true,
    }),
    false,
  );
});

test('hold A/B while Activate is on temporarily removes the preset', () => {
  assert.equal(
    isEffectsLabAudible({
      ...DEFAULT_EFFECTS_LAB_STATE,
      enabled: true,
      effectId: 'warm',
      abBypass: true,
    }),
    false,
  );
  assert.equal(
    shouldBypassLabPreset({
      ...DEFAULT_EFFECTS_LAB_STATE,
      enabled: true,
      effectId: 'warm',
      abBypass: true,
    }),
    true,
  );
});

test('bypass preset is never audible', () => {
  assert.equal(
    isEffectsLabAudible({
      ...DEFAULT_EFFECTS_LAB_STATE,
      enabled: true,
      effectId: 'bypass',
      abBypass: true,
    }),
    false,
  );
});
