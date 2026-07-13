import assert from 'node:assert/strict';
import test from 'node:test';

import { getLabEffectDefinition } from '../presets.ts';
import {
  getPerformanceEffectDefinition,
  PERFORMANCE_EFFECT_DEFINITIONS,
} from './definitions.ts';
import { performanceEffectRestoreMs } from './types.ts';

test('performance effect list has sweep variants and no echo-out', () => {
  assert.equal(PERFORMANCE_EFFECT_DEFINITIONS.length, 4);
  assert.ok(getPerformanceEffectDefinition('filter-sweep-short'));
  assert.ok(getPerformanceEffectDefinition('filter-sweep-long'));
  assert.ok(getPerformanceEffectDefinition('momentary-lowpass'));
  assert.ok(getPerformanceEffectDefinition('reverb-throw'));
  assert.equal(getPerformanceEffectDefinition('momentary-highpass'), undefined);
  assert.equal(getPerformanceEffectDefinition('echo-out'), undefined);
});

test('momentary low-pass is a hold effect', () => {
  const lp = getPerformanceEffectDefinition('momentary-lowpass');
  assert.ok(lp?.hold);
  assert.equal(lp?.trigger, undefined);
});

test('sweep variants are one-shot triggers', () => {
  const shortSweep = getPerformanceEffectDefinition('filter-sweep-short');
  const longSweep = getPerformanceEffectDefinition('filter-sweep-long');
  assert.ok(shortSweep?.trigger);
  assert.ok(longSweep?.trigger);
  assert.ok(performanceEffectRestoreMs('filter-sweep-long') > performanceEffectRestoreMs('filter-sweep-short'));
});

test('Vocal Emphasis whole-song preset uses high-pass', () => {
  const vocal = getLabEffectDefinition('vocal-emphasis');
  assert.ok(vocal);
  assert.equal(vocal.tier, 'phase-c');
  assert.ok(vocal.params.highpassHz > 200);
});

test('Mix Emphasis uses M/S side lean routing', () => {
  const mix = getLabEffectDefinition('mix-emphasis');
  assert.ok(mix);
  assert.equal(mix.params.spatial.routing, 'side-emphasis');
  assert.ok(mix.params.spatial.midMix < 0.5);
  assert.ok(mix.params.spatial.sideMix > 1);
});

test('Filter sweep short restore is shorter than long', () => {
  assert.ok(
    performanceEffectRestoreMs('filter-sweep-long') >
      performanceEffectRestoreMs('filter-sweep-short'),
  );
  assert.equal(performanceEffectRestoreMs('filter-sweep-short'), 3400);
});
