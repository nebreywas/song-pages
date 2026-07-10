import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  sanitizeProjectionWindow,
  VC_PROJECTION_WINDOW_MIN_HEIGHT,
  VC_PROJECTION_WINDOW_MIN_WIDTH,
} from './projectionWindow';

test('sanitizeProjectionWindow clamps to minimum size', () => {
  const bounds = sanitizeProjectionWindow({ x: 10, y: 20, width: 400, height: 300 });
  assert.equal(bounds?.width, VC_PROJECTION_WINDOW_MIN_WIDTH);
  assert.equal(bounds?.height, VC_PROJECTION_WINDOW_MIN_HEIGHT);
  assert.equal(bounds?.x, 10);
  assert.equal(bounds?.y, 20);
});

test('sanitizeProjectionWindow preserves fullscreen flag', () => {
  const bounds = sanitizeProjectionWindow({
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    isFullScreen: true,
  });
  assert.equal(bounds?.isFullScreen, true);
});

test('sanitizeProjectionWindow rejects invalid input', () => {
  assert.equal(sanitizeProjectionWindow(null), undefined);
  assert.equal(sanitizeProjectionWindow({ width: 1280 }), undefined);
});
