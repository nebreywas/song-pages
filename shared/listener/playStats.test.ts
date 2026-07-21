import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SongHistoryEntry } from './songHistory';
import {
  aggregatePlaylistSongPlayStats,
  aggregateSongPlayStats,
  displayPlayCount,
  estimatedFullPlays,
  seekDirectionFromDelta,
} from './playStats';

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
    playbackSeconds: 30,
    durationSeconds: 207,
    interrupted: false,
    interruptedPrevious: false,
    playbackType: 'normal',
    vcMode: false,
    vcModeLabel: null,
    ...overrides,
  };
}

test('estimatedFullPlays floors starts minus interruptions plus half seek hits', () => {
  // Floor(10 - (4 - 0.5*2)) = Floor(10 - 3) = 7
  assert.equal(estimatedFullPlays(10, 4, 2), 7);
  assert.equal(estimatedFullPlays(3, 3, 0), 0);
  assert.equal(estimatedFullPlays(3, 3, 1), 0); // Floor(3 - 2.5) = 0
  assert.equal(estimatedFullPlays(3, 3, 2), 1); // Floor(3 - 2) = 1
});

test('aggregateSongPlayStats keeps lifetime totals separate from playlist slices', () => {
  const entries = [
    entry({ id: 1, songId: 10, playlistId: 2, interrupted: true, playbackSeconds: 40 }),
    entry({ id: 2, songId: 10, playlistId: 9, interrupted: false, playbackSeconds: 200 }),
    entry({ id: 3, songId: 11, playlistId: 2, interrupted: true, playbackSeconds: 10 }),
  ];
  const seekHits = new Set([1]);
  const bySong = aggregateSongPlayStats(entries, seekHits);
  const song10 = bySong.get(10)!;
  assert.equal(song10.totalStarts, 2);
  assert.equal(song10.totalInterruptions, 1);
  assert.equal(song10.seekHitStarts, 1);
  assert.equal(song10.totalPlaybackSeconds, 240);
  assert.equal(song10.estimatedFullPlays, estimatedFullPlays(2, 1, 1));

  const byPlaylist = aggregatePlaylistSongPlayStats(entries, seekHits);
  assert.equal(byPlaylist.get('2:10')?.totalStarts, 1);
  assert.equal(byPlaylist.get('9:10')?.totalStarts, 1);
  // Deleting playlist 2 must not erase lifetime totals on song 10.
  assert.equal(bySong.get(10)?.totalStarts, 2);
});

test('displayPlayCount respects All Starts vs Estimated Full', () => {
  const stats = {
    totalStarts: 5,
    estimatedFullPlays: 3,
  };
  assert.equal(displayPlayCount(stats, 'all-starts'), 5);
  assert.equal(displayPlayCount(stats, 'estimated-full'), 3);
});

test('seekDirectionFromDelta classifies forward vs back', () => {
  assert.equal(seekDirectionFromDelta(10, 25), 'forward');
  assert.equal(seekDirectionFromDelta(25, 10), 'back');
  assert.equal(seekDirectionFromDelta(10, 10), 'forward');
});
