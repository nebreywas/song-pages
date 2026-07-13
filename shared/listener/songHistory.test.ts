import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatHistoryPlaybackCell,
  formatHistorySongCell,
  groupSongHistoryBySession,
  type SongHistoryEntry,
} from './songHistory';

function entry(overrides: Partial<SongHistoryEntry> = {}): SongHistoryEntry {
  return {
    id: 1,
    songId: 10,
    songTitle: 'Black Salt Moon',
    artistName: 'Artist',
    playlistId: 2,
    playlistName: 'Main',
    startedAt: '2026-07-12T18:14:00.000Z',
    completed: false,
    playbackSeconds: 0,
    durationSeconds: 207,
    interrupted: false,
    interruptedPrevious: false,
    playbackType: 'normal',
    vcMode: false,
    vcModeLabel: null,
    ...overrides,
  };
}

test('formatHistorySongCell shows title only when completed', () => {
  assert.equal(formatHistorySongCell(entry({ completed: true })), 'Black Salt Moon');
});

test('formatHistorySongCell shows partial progress when interrupted', () => {
  assert.equal(
    formatHistorySongCell(entry({ interrupted: true, playbackSeconds: 84, durationSeconds: 207 })),
    'Black Salt Moon (1:24 / 3:27)',
  );
});

test('formatHistoryPlaybackCell labels on-deck playback', () => {
  assert.equal(formatHistoryPlaybackCell(entry({ playbackType: 'on-deck' })), 'Played On Deck');
});

test('formatHistoryPlaybackCell labels play-now as interrupting previous song', () => {
  assert.equal(
    formatHistoryPlaybackCell(entry({ playbackType: 'play-now', interruptedPrevious: true })),
    'Interrupted previous song',
  );
});

test('formatHistoryPlaybackCell labels interrupted songs', () => {
  assert.equal(
    formatHistoryPlaybackCell(entry({ interrupted: true })),
    'Interrupted by another song',
  );
});

test('groupSongHistoryBySession groups entries under Today and Yesterday', () => {
  const now = new Date('2026-07-12T20:00:00.000Z');
  const groups = groupSongHistoryBySession(
    [
      entry({ id: 1, startedAt: '2026-07-12T18:14:00.000Z', songTitle: 'A' }),
      entry({ id: 2, startedAt: '2026-07-11T20:42:00.000Z', songTitle: 'B' }),
    ],
    now,
  );

  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.label, 'Today');
  assert.equal(groups[0]?.entries.length, 1);
  assert.equal(groups[1]?.label, 'Yesterday');
});
