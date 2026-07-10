import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_LISTENER_PLAYER_SETTINGS,
  normalizeListenerPlayerSettings,
  toggleSeekTimeDisplay,
} from './playerSettings';

test('normalizeListenerPlayerSettings defaults unknown values', () => {
  assert.deepEqual(normalizeListenerPlayerSettings(null), DEFAULT_LISTENER_PLAYER_SETTINGS);
  assert.deepEqual(normalizeListenerPlayerSettings({ seekTimeDisplay: 'nope' }), {
    seekTimeDisplay: 'remaining',
  });
  assert.deepEqual(normalizeListenerPlayerSettings({ seekTimeDisplay: 'duration' }), {
    seekTimeDisplay: 'duration',
  });
});

test('toggleSeekTimeDisplay alternates modes', () => {
  assert.equal(toggleSeekTimeDisplay('remaining'), 'duration');
  assert.equal(toggleSeekTimeDisplay('duration'), 'remaining');
});
