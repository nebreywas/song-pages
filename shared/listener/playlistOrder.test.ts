import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyCustomPlaylistOrder,
  appendToCustomOrderIfExists,
  buildCatalogOrderMap,
  removeFromCustomOrder,
  reorderPlaylistIds,
  syncCustomPlaylistOrder,
} from './playlistOrder.ts';

test('syncCustomPlaylistOrder removes deleted songs and appends new ones', () => {
  assert.deepEqual(syncCustomPlaylistOrder([10, 20, 30], [10, 30, 40]), [10, 30, 40]);
  assert.deepEqual(syncCustomPlaylistOrder([10, 20, 30], [40, 50]), [40, 50]);
  assert.deepEqual(syncCustomPlaylistOrder([], [1, 2, 3]), [1, 2, 3]);
});

test('appendToCustomOrderIfExists appends only when custom order already exists', () => {
  assert.equal(appendToCustomOrderIfExists([], 99), null);
  assert.deepEqual(appendToCustomOrderIfExists([1, 2], 3), [1, 2, 3]);
  assert.deepEqual(appendToCustomOrderIfExists([1, 2], 2), [1, 2]);
});

test('removeFromCustomOrder drops one id and clears when empty', () => {
  assert.deepEqual(removeFromCustomOrder([1, 2, 3], 2), [1, 3]);
  assert.equal(removeFromCustomOrder([5], 5), null);
  assert.deepEqual(removeFromCustomOrder([1, 2], 9), [1, 2]);
});

test('buildCatalogOrderMap assigns stable catalog positions', () => {
  const songs = [
    { id: 3, sort_order: 30 },
    { id: 1, sort_order: 10 },
    { id: 2, sort_order: 20 },
  ];
  const map = buildCatalogOrderMap(songs);
  assert.equal(map.get(1), 1);
  assert.equal(map.get(2), 2);
  assert.equal(map.get(3), 3);
});

test('reorderPlaylistIds moves an item to a new index', () => {
  assert.deepEqual(reorderPlaylistIds(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorderPlaylistIds(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
});

test('applyCustomPlaylistOrder sorts by saved id list', () => {
  const songs = [
    { id: 1, sort_order: 1, title: 'a' },
    { id: 2, sort_order: 2, title: 'b' },
    { id: 3, sort_order: 3, title: 'c' },
  ];
  assert.deepEqual(
    applyCustomPlaylistOrder(songs, [3, 1, 2]).map((song) => song.id),
    [3, 1, 2],
  );
});
