import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyFloatPointerDrag,
  clampRotationDeg,
  clampFloat,
  rotateFloat,
  resetFloatRotation,
  sanitizeFloats,
} from './floats';
import { surfaceFloatStyle } from './surfaceRectStyle';

test('clampRotationDeg wraps to 0–359', () => {
  assert.equal(clampRotationDeg(0), 0);
  assert.equal(clampRotationDeg(359), 359);
  assert.equal(clampRotationDeg(360), 0);
  assert.equal(clampRotationDeg(-1), 359);
  assert.equal(clampRotationDeg(361), 1);
});

test('sanitizeFloats preserves rotation and omits zero', () => {
  const withRotation = sanitizeFloats([
    { id: 'float-1', x: 0.1, y: 0.2, width: 0.3, height: 0.25, zIndex: 1, rotationDeg: 45 },
  ]);
  assert.equal(withRotation[0]?.rotationDeg, 45);

  const zeroRotation = sanitizeFloats([
    { id: 'float-1', x: 0.1, y: 0.2, width: 0.3, height: 0.25, zIndex: 1, rotationDeg: 0 },
  ]);
  assert.equal(zeroRotation[0]?.rotationDeg, undefined);
});

test('clampFloat keeps rotation across position clamp', () => {
  const rotated = rotateFloat(
    { id: 'f1', x: 0.1, y: 0.1, width: 0.2, height: 0.2, zIndex: 1, rotationDeg: 90 },
    90,
  );
  const moved = clampFloat({ ...rotated, x: 0.5, y: 0.5 });
  assert.equal(moved.rotationDeg, 90);
});

test('applyFloatPointerDrag rotates when shift is held', () => {
  const float = { id: 'f1', x: 0.2, y: 0.2, width: 0.3, height: 0.2, zIndex: 1, rotationDeg: 10 };
  const drag = { offsetX: 0, offsetY: 0, startRotationDeg: 10, startNormY: 0.5 };
  const rotated = applyFloatPointerDrag(float, { x: 0.2, y: 0.75 }, drag, true);
  assert.equal(rotated.rotationDeg, 55);
  assert.equal(rotated.x, float.x);
  assert.equal(rotated.y, float.y);
});

test('resetFloatRotation clears rotationDeg', () => {
  const rotated = rotateFloat(
    { id: 'f1', x: 0.1, y: 0.1, width: 0.2, height: 0.2, zIndex: 1 },
    45,
  );
  assert.equal(rotated.rotationDeg, 45);
  const reset = resetFloatRotation(rotated);
  assert.equal(reset.rotationDeg, undefined);
});

test('surfaceFloatStyle adds transform when rotated', () => {
  const plain = surfaceFloatStyle({ x: 0, y: 0, width: 0.5, height: 0.25 });
  assert.equal(plain.transform, undefined);

  const rotated = surfaceFloatStyle({ x: 0, y: 0, width: 0.5, height: 0.25, rotationDeg: 30 });
  assert.equal(rotated.transform, 'rotate(30deg)');
  assert.equal(rotated.transformOrigin, 'center center');
});
