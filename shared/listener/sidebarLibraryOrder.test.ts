import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_SIDEBAR_LIBRARY_SORT,
  layoutSidebarLibrary,
  mergeSidebarLibraryOrder,
  normalizeSidebarLibraryOrder,
  normalizeSidebarLibrarySort,
  reorderSidebarLibraryOrder,
  toggleSidebarLibrarySort,
} from './sidebarLibraryOrder.ts';

const artist = (id: number, name: string, createdAt = '', songCount = 0) => ({
  id,
  site_url: '',
  site_root_normalized: '',
  artist_slug: `artist-${id}`,
  artist_name: name,
  artist_photo_url: null,
  artist_bio: null,
  artist_social_json: null,
  build_version: null,
  last_fetched_at: null,
  created_at: createdAt,
  song_count: songCount,
});

test('normalizeSidebarLibraryOrder keeps finite numeric ids', () => {
  assert.deepEqual(normalizeSidebarLibraryOrder([1, 2.9, 'x', null]), [1, 2]);
});

test('normalizeSidebarLibrarySort defaults unknown values', () => {
  assert.deepEqual(normalizeSidebarLibrarySort(null), DEFAULT_SIDEBAR_LIBRARY_SORT);
  assert.deepEqual(normalizeSidebarLibrarySort({ column: 'name', direction: 'desc' }), {
    column: 'name',
    direction: 'desc',
  });
  assert.deepEqual(normalizeSidebarLibrarySort({ column: 'bad', direction: 'sideways' }), {
    column: 'order',
    direction: 'asc',
  });
});

test('mergeSidebarLibraryOrder appends new artists and drops removed ids', () => {
  const rest = [artist(1, 'Alpha'), artist(2, 'Beta'), artist(3, 'Gamma')];
  const merged = mergeSidebarLibraryOrder(rest, [3, 9, 1]);
  assert.deepEqual(
    merged.ordered.map((row) => row.id),
    [3, 1, 2],
  );
  assert.deepEqual(merged.orderIds, [3, 1, 2]);
});

test('layoutSidebarLibrary pins Liked Songs and sorts the rest by manual order', () => {
  const rows = [
    artist(0, 'Liked Songs'),
    artist(2, 'Beta'),
    artist(1, 'Alpha'),
    artist(3, 'Gamma'),
  ];
  const layout = layoutSidebarLibrary(rows, [2, 1, 3], DEFAULT_SIDEBAR_LIBRARY_SORT);
  assert.deepEqual(
    layout.displayArtists.map((row) => row.id),
    [0, 2, 1, 3],
  );
  assert.deepEqual(layout.orderNumberById.get(2), 1);
});

test('layoutSidebarLibrary sorts by name while keeping Liked Songs first', () => {
  const rows = [artist(0, 'Liked Songs'), artist(2, 'Beta'), artist(1, 'Alpha')];
  const layout = layoutSidebarLibrary(rows, [2, 1], { column: 'name', direction: 'asc' });
  assert.deepEqual(
    layout.displayArtists.map((row) => row.id),
    [0, 1, 2],
  );
});

test('reorderSidebarLibraryOrder moves ids within the manual list', () => {
  assert.deepEqual(reorderSidebarLibraryOrder([1, 2, 3], 0, 2), [2, 3, 1]);
});

test('toggleSidebarLibrarySort flips direction on repeat clicks', () => {
  assert.deepEqual(toggleSidebarLibrarySort({ column: 'name', direction: 'asc' }, 'name'), {
    column: 'name',
    direction: 'desc',
  });
  assert.deepEqual(toggleSidebarLibrarySort({ column: 'name', direction: 'desc' }, 'type'), {
    column: 'type',
    direction: 'asc',
  });
});
