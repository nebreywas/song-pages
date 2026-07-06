import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findDividerKeyForAreaNudge,
  nudgeDivider,
  nudgeFloat,
  onePixelNorm,
} from './designerKeyboard';
import { computeSurfaceLayout } from './geometry';
import { clampFloat } from './floats';

test('onePixelNorm converts surface pixels to normalized deltas', () => {
  const norm = onePixelNorm({ widthPx: 500, heightPx: 250 });
  assert.equal(norm.x, 0.002);
  assert.equal(norm.y, 0.004);
});

test('findDividerKeyForAreaNudge resolves quad area edges', () => {
  const layout = computeSurfaceLayout('quad', {
    primaryVertical: 0.5,
    primaryHorizontal: 0.5,
  });
  const eps = 0.002;

  assert.equal(findDividerKeyForAreaNudge(layout, 1, 'right', eps), 'primaryVertical');
  assert.equal(findDividerKeyForAreaNudge(layout, 1, 'down', eps), 'primaryHorizontal');
  assert.equal(findDividerKeyForAreaNudge(layout, 1, 'left', eps), null);
  assert.equal(findDividerKeyForAreaNudge(layout, 2, 'left', eps), 'primaryVertical');
});

test('nudgeDivider moves a divider by one normalized pixel', () => {
  const before = { primaryVertical: 0.5 };
  const layout = computeSurfaceLayout('double-vertical', before);
  const handle = layout.dividers.find((d) => d.key === 'primaryVertical');
  assert.ok(handle);

  const delta = 1 / 400;
  const next = nudgeDivider('double-vertical', before, 'primaryVertical', delta);
  assert.ok(next.primaryVertical > before.primaryVertical);
});

test('nudgeFloat moves float position', () => {
  const float = clampFloat({
    id: 'float-1',
    x: 0.1,
    y: 0.2,
    width: 0.25,
    height: 0.25,
    zIndex: 1,
  });
  const moved = nudgeFloat(float, 0.01, -0.02);
  assert.ok(Math.abs(moved.x - 0.11) < 1e-9);
  assert.ok(Math.abs(moved.y - 0.18) < 1e-9);
});
