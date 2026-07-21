import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  accumulateAlareSpeedNudgeLines,
  applyAlareSpeedNudge,
  clampAlareSpeedNudge,
  formatAlareSpeedNudgePercent,
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
  assert.equal(clampAlareSpeedNudge(ALARE_SPEED_NUDGE_STEP * 20), ALARE_SPEED_NUDGE_MAX);
  assert.equal(clampAlareSpeedNudge(ALARE_SPEED_NUDGE_MAX + 1), ALARE_SPEED_NUDGE_MAX);
  assert.equal(clampAlareSpeedNudge(-ALARE_SPEED_NUDGE_MAX - 1), -ALARE_SPEED_NUDGE_MAX);
  assert.equal(ALARE_SPEED_NUDGE_MAX, 0.5);
});

test('formatAlareSpeedNudgePercent renders a signed one-decimal percent', () => {
  // Two +2.5% presses read as the "+5.0%" the controller message shows.
  assert.equal(formatAlareSpeedNudgePercent(ALARE_SPEED_NUDGE_STEP * 2), '+5.0%');
  assert.equal(formatAlareSpeedNudgePercent(ALARE_SPEED_NUDGE_STEP), '+2.5%');
  assert.equal(formatAlareSpeedNudgePercent(-ALARE_SPEED_NUDGE_STEP), '-2.5%');
  assert.equal(formatAlareSpeedNudgePercent(0), '0.0%');
  // Clamps before formatting so the readout can't exceed the real ±50% range.
  assert.equal(formatAlareSpeedNudgePercent(1), '+50.0%');
  assert.equal(formatAlareSpeedNudgePercent(-1), '-50.0%');
});
