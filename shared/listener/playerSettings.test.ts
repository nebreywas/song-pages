import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_LISTENER_PLAYER_SETTINGS,
  normalizeListenerPlayerSettings,
  normalizeSongPageFontIncreaseLevel,
  normalizeYoutubeMiniPlayerBehavior,
  songPageFontScaleFromLevel,
  toggleSeekTimeDisplay,
} from './playerSettings';

test('normalizeListenerPlayerSettings defaults unknown values', () => {
  assert.deepEqual(normalizeListenerPlayerSettings(null), DEFAULT_LISTENER_PLAYER_SETTINGS);
  assert.deepEqual(normalizeListenerPlayerSettings({ seekTimeDisplay: 'nope' }), {
    seekTimeDisplay: 'remaining',
    zenModeEnabled: false,
    radioModeEnabled: false,
    radioVoiceId: 'allison',
    showSunoPromptInformation: false,
    songPageFontIncreaseLevel: 0,
    youtubeMiniPlayerBehavior: 'projector',
    playCountDisplay: 'all-starts',
  });
  assert.deepEqual(normalizeListenerPlayerSettings({ seekTimeDisplay: 'duration' }), {
    seekTimeDisplay: 'duration',
    zenModeEnabled: false,
    radioModeEnabled: false,
    radioVoiceId: 'allison',
    showSunoPromptInformation: false,
    songPageFontIncreaseLevel: 0,
    youtubeMiniPlayerBehavior: 'projector',
    playCountDisplay: 'all-starts',
  });
});

test('normalizeListenerPlayerSettings requires an explicit Zen opt-in', () => {
  assert.equal(normalizeListenerPlayerSettings({ zenModeEnabled: true }).zenModeEnabled, true);
  assert.equal(normalizeListenerPlayerSettings({ zenModeEnabled: false }).zenModeEnabled, false);
  assert.equal(
    normalizeListenerPlayerSettings({ zenModeEnabled: 'yes' as unknown as boolean }).zenModeEnabled,
    false,
  );
});

test('normalizeListenerPlayerSettings requires an explicit Radio opt-in', () => {
  assert.equal(normalizeListenerPlayerSettings({ radioModeEnabled: true }).radioModeEnabled, true);
  assert.equal(normalizeListenerPlayerSettings({ radioModeEnabled: false }).radioModeEnabled, false);
  assert.equal(normalizeListenerPlayerSettings({ radioVoiceId: 'nathan' }).radioVoiceId, 'nathan');
  assert.equal(normalizeListenerPlayerSettings({ radioVoiceId: 'random' }).radioVoiceId, 'random');
  assert.equal(normalizeListenerPlayerSettings({ radioVoiceId: 'nope' }).radioVoiceId, 'allison');
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

test('normalizeYoutubeMiniPlayerBehavior whitelists known behaviors, else projector', () => {
  assert.equal(normalizeYoutubeMiniPlayerBehavior('projector'), 'projector');
  assert.equal(normalizeYoutubeMiniPlayerBehavior('expand'), 'expand');
  assert.equal(normalizeYoutubeMiniPlayerBehavior('skip'), 'skip');
  assert.equal(normalizeYoutubeMiniPlayerBehavior('nonsense'), 'projector');
  assert.equal(normalizeYoutubeMiniPlayerBehavior(undefined), 'projector');
  assert.equal(normalizeYoutubeMiniPlayerBehavior(42), 'projector');
});

test('normalizeListenerPlayerSettings keeps a valid YouTube mini-player behavior', () => {
  assert.equal(
    normalizeListenerPlayerSettings({ youtubeMiniPlayerBehavior: 'skip' }).youtubeMiniPlayerBehavior,
    'skip',
  );
  assert.equal(
    normalizeListenerPlayerSettings({ youtubeMiniPlayerBehavior: 'bogus' as never })
      .youtubeMiniPlayerBehavior,
    'projector',
  );
});

test('normalizeListenerPlayerSettings keeps playCountDisplay mode', () => {
  assert.equal(
    normalizeListenerPlayerSettings({ playCountDisplay: 'estimated-full' }).playCountDisplay,
    'estimated-full',
  );
  assert.equal(
    normalizeListenerPlayerSettings({ playCountDisplay: 'bogus' as never }).playCountDisplay,
    'all-starts',
  );
});
