import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isVcPerformanceEffectCommand,
} from './performanceEffect.ts';

test('isVcPerformanceEffectCommand accepts known pads', () => {
  assert.equal(
    isVcPerformanceEffectCommand({ effectId: 'filter-sweep-short', phase: 'trigger' }),
    true,
  );
  assert.equal(
    isVcPerformanceEffectCommand({ effectId: 'momentary-lowpass', phase: 'hold' }),
    true,
  );
});

test('isVcPerformanceEffectCommand rejects garbage', () => {
  assert.equal(isVcPerformanceEffectCommand(null), false);
  assert.equal(isVcPerformanceEffectCommand({ effectId: 'echo-out', phase: 'trigger' }), false);
  assert.equal(
    isVcPerformanceEffectCommand({ effectId: 'filter-sweep-short', phase: 'nope' }),
    false,
  );
});
