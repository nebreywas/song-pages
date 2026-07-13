import assert from 'node:assert/strict';
import { test } from 'node:test';

import { orderPlaylistSongsForCue, pickCueSongInPlaylist } from './startupCue';

const songs = [
  { id: 1, sort_order: 2, skipped: 0 },
  { id: 2, sort_order: 1, skipped: 0 },
  { id: 3, sort_order: 3, skipped: 1 },
];

test('orderPlaylistSongsForCue uses custom order when provided', () => {
  assert.deepEqual(
    orderPlaylistSongsForCue(songs, [3, 1, 2]).map((song) => song.id),
    [3, 1, 2],
  );
});

test('orderPlaylistSongsForCue falls back to sort_order', () => {
  assert.deepEqual(orderPlaylistSongsForCue(songs).map((song) => song.id), [2, 1, 3]);
});

test('pickCueSongInPlaylist prefers saved song when playable', () => {
  const picked = pickCueSongInPlaylist(songs, { preferredSongId: 1 });
  assert.equal(picked?.id, 1);
});

test('pickCueSongInPlaylist skips unavailable saved song and uses first playable', () => {
  const picked = pickCueSongInPlaylist(songs, { preferredSongId: 3 });
  assert.equal(picked?.id, 2);
});

test('pickCueSongInPlaylist returns null when nothing is playable', () => {
  const skippedOnly = songs.map((song) => ({ ...song, skipped: 1 }));
  assert.equal(pickCueSongInPlaylist(skippedOnly), null);
});
