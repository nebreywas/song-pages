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
    viewMode: 'markdown',
  });
  assert.deepEqual(normalizeListenerLyricsDisplaySettings({ removeBrackets: 'yes' }), {
    removeBrackets: false,
    viewMode: 'markdown',
  });
});

test('normalizeListenerLyricsDisplaySettings accepts viewMode', () => {
  assert.deepEqual(
    normalizeListenerLyricsDisplaySettings({ removeBrackets: true, viewMode: 'pretty' }),
    { removeBrackets: true, viewMode: 'pretty' },
  );
  assert.deepEqual(
    normalizeListenerLyricsDisplaySettings({ viewMode: 'plain' }),
    { removeBrackets: false, viewMode: 'plain' },
  );
  assert.equal(
    normalizeListenerLyricsDisplaySettings({ viewMode: 'nope' }).viewMode,
    'markdown',
  );
});
