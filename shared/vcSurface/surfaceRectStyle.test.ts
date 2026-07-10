import assert from 'node:assert/strict';
import { test } from 'node:test';

import { surfaceRectStyle } from './surfaceRectStyle';

test('surfaceRectStyle bleeds interior edges by 2px to close subpixel gaps', () => {
  const style = surfaceRectStyle({ x: 0, y: 0.18, width: 1, height: 0.82 });
  assert.equal(style.left, '0%');
  assert.equal(style.top, 'calc(18% - 2px)');
  assert.equal(style.width, 'calc(100% + 2px)');
  assert.equal(style.height, 'calc(82% + 2px)');
});

test('surfaceRectStyle uses larger bleed when grid dividers are hidden', () => {
  const style = surfaceRectStyle({ x: 0, y: 0.18, width: 1, height: 0.82 }, { edgeBleedPx: 8 });
  assert.equal(style.top, 'calc(18% - 8px)');
  assert.equal(style.height, 'calc(82% + 8px)');
});

test('surfaceRectStyle does not bleed the surface origin edges', () => {
  const style = surfaceRectStyle({ x: 0, y: 0, width: 1, height: 0.18 });
  assert.equal(style.left, '0%');
  assert.equal(style.top, '0%');
});
