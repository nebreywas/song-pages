import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  accumulateAlareSpeedNudgeLines,
  applyAlareSpeedNudge,
  clampAlareSpeedNudge,
  ALARE_SPEED_NUDGE_MAX,
  ALARE_SPEED_NUDGE_STEP,
} from './speedNudge';

test('applyAlareSpeedNudge keeps song start at zero', () => {
  assert.equal(applyAlareSpeedNudge(0, 0.1, 240), 0);
});

test('applyAlareSpeedNudge scales mid-song time', () => {
  assert.equal(applyAlareSpeedNudge(100, 0.05, 240), 105);
  assert.equal(applyAlareSpeedNudge(100, -0.05, 240), 95);
});

test('applyAlareSpeedNudge clamps to duration', () => {
  assert.equal(applyAlareSpeedNudge(200, 0.1, 210), 210);
});

test('accumulateAlareSpeedNudgeLines adds line offset proportional to nudge', () => {
  const next = accumulateAlareSpeedNudgeLines(0, 10, 0.1, 0.5);
  assert.equal(next, 0.5);
});

test('clampAlareSpeedNudge respects step range', () => {
  assert.equal(clampAlareSpeedNudge(ALARE_SPEED_NUDGE_STEP * 4), ALARE_SPEED_NUDGE_STEP * 4);
  assert.equal(clampAlareSpeedNudge(ALARE_SPEED_NUDGE_STEP * 10), ALARE_SPEED_NUDGE_MAX);
  assert.equal(clampAlareSpeedNudge(ALARE_SPEED_NUDGE_MAX + 1), ALARE_SPEED_NUDGE_MAX);
  assert.equal(clampAlareSpeedNudge(-ALARE_SPEED_NUDGE_MAX - 1), -ALARE_SPEED_NUDGE_MAX);
});
