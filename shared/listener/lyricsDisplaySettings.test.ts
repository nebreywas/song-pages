import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  normalizeListenerLyricsDisplaySettings,
} from './lyricsDisplaySettings';

test('normalizeListenerLyricsDisplaySettings defaults unknown values', () => {
  assert.deepEqual(normalizeListenerLyricsDisplaySettings(null), DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS);
  assert.deepEqual(normalizeListenerLyricsDisplaySettings({ removeBrackets: true }), {
    removeBrackets: true,
  });
  assert.deepEqual(normalizeListenerLyricsDisplaySettings({ removeBrackets: 'yes' }), {
    removeBrackets: false,
  });
});
