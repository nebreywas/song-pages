import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_LISTENER_PLAYER_SETTINGS,
  normalizeListenerPlayerSettings,
  normalizeSongPageFontIncreaseLevel,
  songPageFontScaleFromLevel,
  toggleSeekTimeDisplay,
} from './playerSettings';

test('normalizeListenerPlayerSettings defaults unknown values', () => {
  assert.deepEqual(normalizeListenerPlayerSettings(null), DEFAULT_LISTENER_PLAYER_SETTINGS);
  assert.deepEqual(normalizeListenerPlayerSettings({ seekTimeDisplay: 'nope' }), {
    seekTimeDisplay: 'remaining',
    showSunoPromptInformation: false,
    songPageFontIncreaseLevel: 0,
  });
  assert.deepEqual(normalizeListenerPlayerSettings({ seekTimeDisplay: 'duration' }), {
    seekTimeDisplay: 'duration',
    showSunoPromptInformation: false,
    songPageFontIncreaseLevel: 0,
  });
});

test('normalizeListenerPlayerSettings requires opt-in for Suno prompts', () => {
  assert.equal(
    normalizeListenerPlayerSettings({ showSunoPromptInformation: true }).showSunoPromptInformation,
    true,
  );
  assert.equal(
    normalizeListenerPlayerSettings({ showSunoPromptInformation: false }).showSunoPromptInformation,
    false,
  );
  assert.equal(
    normalizeListenerPlayerSettings({ showSunoPromptInformation: 'yes' as unknown as boolean })
      .showSunoPromptInformation,
    false,
  );
});

test('normalizeSongPageFontIncreaseLevel clamps to 0–4', () => {
  assert.equal(normalizeSongPageFontIncreaseLevel(undefined), 0);
  assert.equal(normalizeSongPageFontIncreaseLevel(2), 2);
  assert.equal(normalizeSongPageFontIncreaseLevel(9), 4);
  assert.equal(normalizeSongPageFontIncreaseLevel(-1), 0);
  assert.equal(normalizeSongPageFontIncreaseLevel(2.6), 3);
});

test('songPageFontScaleFromLevel maps levels without exposing percents in UI', () => {
  assert.equal(songPageFontScaleFromLevel(0), 1);
  assert.equal(songPageFontScaleFromLevel(1), 1.05);
  assert.equal(songPageFontScaleFromLevel(2), 1.1);
  assert.equal(songPageFontScaleFromLevel(3), 1.2);
  assert.equal(songPageFontScaleFromLevel(4), 1.3);
});

test('normalizeListenerPlayerSettings keeps font increase level', () => {
  assert.equal(
    normalizeListenerPlayerSettings({ songPageFontIncreaseLevel: 3 }).songPageFontIncreaseLevel,
    3,
  );
});

test('toggleSeekTimeDisplay alternates modes', () => {
  assert.equal(toggleSeekTimeDisplay('remaining'), 'duration');
  assert.equal(toggleSeekTimeDisplay('duration'), 'remaining');
});
