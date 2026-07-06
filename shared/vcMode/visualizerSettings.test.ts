import assert from 'node:assert/strict';
import test from 'node:test';

import {
  changeRuleIntervalMs,
  pickNextVisualizerId,
  sanitizeVisualizerChangeRule,
  sanitizeVisualizerSequence,
  shouldRotateVisualizerOnClick,
  shouldRotateVisualizerOnSongChange,
} from './visualizerSettings';

test('sanitizeVisualizerChangeRule falls back to never', () => {
  assert.equal(sanitizeVisualizerChangeRule(undefined), 'never');
  assert.equal(sanitizeVisualizerChangeRule('bogus'), 'never');
  assert.equal(sanitizeVisualizerChangeRule('5m'), '5m');
});

test('sanitizeVisualizerSequence falls back to random-any', () => {
  assert.equal(sanitizeVisualizerSequence(undefined), 'random-any');
  assert.equal(sanitizeVisualizerSequence('random-milkdrop'), 'random-milkdrop');
});

test('changeRuleIntervalMs maps timed rules to milliseconds', () => {
  assert.equal(changeRuleIntervalMs('never'), null);
  assert.equal(changeRuleIntervalMs('click'), null);
  assert.equal(changeRuleIntervalMs('30s'), 30_000);
  assert.equal(changeRuleIntervalMs('10m'), 600_000);
});

test('rotation trigger helpers match rule semantics', () => {
  assert.equal(shouldRotateVisualizerOnSongChange('new-song'), true);
  assert.equal(shouldRotateVisualizerOnSongChange('5m'), false);
  assert.equal(shouldRotateVisualizerOnClick('click'), true);
  assert.equal(shouldRotateVisualizerOnClick('never'), false);
});

test('pickNextVisualizerId prefers a different id when possible', () => {
  const pool = ['a', 'b', 'c'];
  const next = pickNextVisualizerId(pool, 'b');
  assert.notEqual(next, 'b');
  assert.ok(pool.includes(next));
  assert.equal(pickNextVisualizerId(['solo'], 'solo'), 'solo');
});
