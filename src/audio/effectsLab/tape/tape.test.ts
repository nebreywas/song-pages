import assert from 'node:assert/strict';
import test from 'node:test';

import { getLabEffectDefinition } from '../presets.ts';
import {
  defaultWorkletEnhanceDepth,
  getWorkletProcessorForPreset,
  presetSupportsWorkletEnhance,
} from '../worklet/loadWorkletProcessors.ts';

test('Tape preset is Phase D native baseline', () => {
  const tape = getLabEffectDefinition('tape');
  assert.ok(tape);
  assert.equal(tape.tier, 'phase-d');
  assert.ok(tape.params.driveAmount > 0);
  assert.ok(tape.params.compressorEnabled);
  assert.ok(tape.params.lowpassHz < 22050);
});

test('Tape wow/flutter depth is tuned for character', () => {
  const depth = defaultWorkletEnhanceDepth('tape-wow-flutter');
  assert.ok(depth > 0.5);
  assert.ok(depth < 1);
});

test('Alive and Punch are Phase E hybrid presets', () => {
  const alive = getLabEffectDefinition('alive');
  const punch = getLabEffectDefinition('punch');
  assert.ok(alive);
  assert.ok(punch);
  assert.equal(alive.tier, 'phase-e');
  assert.equal(punch.tier, 'phase-e');
  assert.ok(alive.params.midPeakingGainDb > 0);
  assert.ok(punch.params.compressorAttackSec < 0.005);
});

test('worklet registry maps hybrid presets to processors', () => {
  assert.equal(getWorkletProcessorForPreset('tape'), 'tape-wow-flutter');
  assert.equal(getWorkletProcessorForPreset('alive'), 'alive-harmonic-exciter');
  assert.equal(getWorkletProcessorForPreset('punch'), 'punch-transient-emphasis');
  assert.equal(getWorkletProcessorForPreset('warm'), null);
  assert.equal(presetSupportsWorkletEnhance('alive'), true);
  assert.equal(presetSupportsWorkletEnhance('club'), false);
});
