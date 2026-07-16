import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_LIVE_DEBUG_SETTINGS,
  normalizeLiveDebugSettings,
  toggleLiveDebugEnabled,
} from './settings.ts';

test('normalizeLiveDebugSettings defaults to off', () => {
  assert.deepEqual(normalizeLiveDebugSettings(null), DEFAULT_LIVE_DEBUG_SETTINGS);
  assert.deepEqual(normalizeLiveDebugSettings({}), { enabled: false });
});

test('normalizeLiveDebugSettings requires explicit true', () => {
  assert.equal(normalizeLiveDebugSettings({ enabled: true }).enabled, true);
  assert.equal(normalizeLiveDebugSettings({ enabled: 1 }).enabled, false);
});

test('toggleLiveDebugEnabled flips the flag', () => {
  assert.deepEqual(toggleLiveDebugEnabled({ enabled: false }), { enabled: true });
  assert.deepEqual(toggleLiveDebugEnabled({ enabled: true }), { enabled: false });
});
