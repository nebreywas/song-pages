import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clampCautionMinutes,
  DEFAULT_PLAYLIST_LENGTH_SETTINGS,
  normalizePlaylistLengthSettings,
} from './playlistLengthSettings';

test('normalizePlaylistLengthSettings applies defaults', () => {
  assert.deepEqual(normalizePlaylistLengthSettings(null), DEFAULT_PLAYLIST_LENGTH_SETTINGS);
  assert.deepEqual(
    normalizePlaylistLengthSettings({ cautionLongSongsEnabled: false, cautionMinutes: 12 }),
    { cautionLongSongsEnabled: false, cautionMinutes: 12 },
  );
});

test('clampCautionMinutes enforces 1-120', () => {
  assert.equal(clampCautionMinutes(0), 1);
  assert.equal(clampCautionMinutes(999), 120);
  assert.equal(clampCautionMinutes('15.9'), 15);
});
