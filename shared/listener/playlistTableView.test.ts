import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_PLAYLIST_TABLE_VIEW,
  normalizePlaylistTableViewState,
  normalizePlaylistTableViewStore,
  playlistTableViewForKey,
  togglePlaylistYearColumnMode,
} from './playlistTableView';

test('normalizePlaylistTableViewState defaults unknown values', () => {
  assert.deepEqual(normalizePlaylistTableViewState(null), DEFAULT_PLAYLIST_TABLE_VIEW);
  assert.deepEqual(normalizePlaylistTableViewState({ sortColumn: 'nope' }), {
    yearColumnMode: 'year',
    sortColumn: 'order',
    sortDirection: 'asc',
  });
});

test('normalizePlaylistTableViewState keeps year/plays sort coherent with mode', () => {
  assert.equal(
    normalizePlaylistTableViewState({
      yearColumnMode: 'plays',
      sortColumn: 'year',
      sortDirection: 'desc',
    }).sortColumn,
    'plays',
  );
  assert.equal(
    normalizePlaylistTableViewState({
      yearColumnMode: 'year',
      sortColumn: 'plays',
    }).sortColumn,
    'year',
  );
});

test('togglePlaylistYearColumnMode flips slot and remaps active sort', () => {
  const toPlays = togglePlaylistYearColumnMode({
    yearColumnMode: 'year',
    sortColumn: 'year',
    sortDirection: 'asc',
  });
  assert.deepEqual(toPlays, {
    yearColumnMode: 'plays',
    sortColumn: 'plays',
    sortDirection: 'asc',
  });

  const toYear = togglePlaylistYearColumnMode(toPlays);
  assert.deepEqual(toYear, {
    yearColumnMode: 'year',
    sortColumn: 'year',
    sortDirection: 'asc',
  });
});

test('playlistTableViewForKey reads per-playlist store entries', () => {
  const store = normalizePlaylistTableViewStore({
    'user:3': {
      yearColumnMode: 'plays',
      sortColumn: 'title',
      sortDirection: 'desc',
    },
  });
  assert.equal(playlistTableViewForKey(store, 'user:3').yearColumnMode, 'plays');
  assert.equal(playlistTableViewForKey(store, 'user:3').sortColumn, 'title');
  assert.deepEqual(playlistTableViewForKey(store, 'artist:9'), DEFAULT_PLAYLIST_TABLE_VIEW);
});
