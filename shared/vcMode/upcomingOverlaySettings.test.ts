import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS,
  sanitizeUpcomingOverlaySettings,
} from './upcomingOverlaySettings';

test('sanitizeUpcomingOverlaySettings applies defaults for invalid input', () => {
  assert.deepEqual(sanitizeUpcomingOverlaySettings(null), DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS);
  assert.deepEqual(sanitizeUpcomingOverlaySettings({ position: 'nope', maxCount: 99 }), {
    position: 'center',
    maxCount: 10,
  });
});

test('sanitizeUpcomingOverlaySettings keeps valid position and max count', () => {
  assert.deepEqual(
    sanitizeUpcomingOverlaySettings({ position: 'right', maxCount: 15 }),
    { position: 'right', maxCount: 15 },
  );
});
