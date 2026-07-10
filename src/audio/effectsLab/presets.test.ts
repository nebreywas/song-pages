import assert from 'node:assert/strict';
import test from 'node:test';

import { bypassParams, getLabEffectDefinition, resolveLabEffectParams } from './presets.ts';

test('getLabEffectDefinition includes Phase A wide warm club', () => {
  assert.ok(getLabEffectDefinition('wide'));
  assert.ok(getLabEffectDefinition('warm'));
  assert.ok(getLabEffectDefinition('club'));
});

test('getLabEffectDefinition includes Phase B spatial presets', () => {
  assert.ok(getLabEffectDefinition('dream'));
  assert.ok(getLabEffectDefinition('mono-punch'));
  assert.ok(getLabEffectDefinition('underwater'));
  assert.ok(getLabEffectDefinition('arena'));
  assert.ok(getLabEffectDefinition('air'));
});

test('Phase B dream uses plate convolution for tight reverb blend', () => {
  const dream = getLabEffectDefinition('dream');
  assert.ok(dream);
  assert.equal(dream.params.spatial.wetMode, 'convolver-plate');
  assert.ok(dream.params.spatial.wetMix > 0);
  assert.ok(dream.params.spatial.convolverDurationSec < 1.5);
  assert.ok(dream.params.spatial.wetReturnFilterHz < 5000);
});

test('Phase B arena uses hall convolution wet path', () => {
  const arena = getLabEffectDefinition('arena');
  assert.ok(arena);
  assert.equal(arena.params.spatial.wetMode, 'convolver-hall');
  assert.ok(arena.params.spatial.wetMix > 0);
});

test('Phase B mono-punch sums to mono routing', () => {
  const mono = getLabEffectDefinition('mono-punch');
  assert.ok(mono);
  assert.equal(mono.params.spatial.routing, 'mono-sum');
});

test('resolveLabEffectParams applies user trim on preset compensation', () => {
  const warm = resolveLabEffectParams('warm', 1, false);
  const def = getLabEffectDefinition('warm');
  assert.ok(def);
  assert.equal(warm.outputTrimDb, def.params.outputTrimDb + 1);
});

test('resolveLabEffectParams forceBypass ignores effect id', () => {
  const flat = resolveLabEffectParams('club', 2, true);
  assert.equal(flat.bassLowshelfGainDb, 0);
  assert.equal(flat.outputTrimDb, 2);
  assert.equal(flat.compressorEnabled, false);
});

test('bypassParams is neutral', () => {
  const flat = bypassParams();
  assert.equal(flat.driveAmount, 0);
  assert.equal(flat.lowpassHz, 22050);
  assert.equal(flat.lowpassQ, 0.7);
  assert.equal(flat.spatial.wetMode, 'none');
});
