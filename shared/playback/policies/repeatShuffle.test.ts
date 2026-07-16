import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cycleRepeatMode } from './repeatShuffle.ts';

test('cycleRepeatMode rotates off → all → one → off', () => {
  assert.equal(cycleRepeatMode('off'), 'all');
  assert.equal(cycleRepeatMode('all'), 'one');
  assert.equal(cycleRepeatMode('one'), 'off');
});
