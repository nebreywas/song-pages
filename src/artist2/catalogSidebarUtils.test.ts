import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Artist2CatalogObject, Artist2LibraryFilter } from '@shared/artist2';
import { ARTIST2_LIBRARY_FILTER_ALL } from '@shared/artist2';

import {
  catalogObjectHasRecording,
  filterCatalogObjects,
  nextSortKeyForColumn,
  sortCatalogObjects,
  sortColumnFromKey,
  toggleLibraryFilter,
  type CatalogSortKey,
} from './catalogSidebarUtils';

// Minimal catalog object — only the fields the sort/label helpers read.
function obj(overrides: Partial<Artist2CatalogObject>): Artist2CatalogObject {
  return {
    id: overrides.id ?? overrides.name ?? 'x',
    name: overrides.name ?? 'x',
    kind: overrides.kind ?? 'song',
    contentType: overrides.contentType ?? null,
    createdAt: overrides.createdAt ?? '2020-01-01T00:00:00.000Z',
    ...overrides,
  } as Artist2CatalogObject;
}

// --- sortColumnFromKey -----------------------------------------------------

test('sortColumnFromKey maps every key to its column + direction', () => {
  assert.deepEqual(sortColumnFromKey('name-asc'), { column: 'name', direction: 'asc' });
  assert.deepEqual(sortColumnFromKey('name-desc'), { column: 'name', direction: 'desc' });
  assert.deepEqual(sortColumnFromKey('type-asc'), { column: 'type', direction: 'asc' });
  assert.deepEqual(sortColumnFromKey('type-desc'), { column: 'type', direction: 'desc' });
  assert.deepEqual(sortColumnFromKey('added-asc'), { column: 'added', direction: 'asc' });
  assert.deepEqual(sortColumnFromKey('added-desc'), { column: 'added', direction: 'desc' });
});

// --- nextSortKeyForColumn --------------------------------------------------

test('nextSortKeyForColumn toggles direction when the column is already active', () => {
  assert.equal(nextSortKeyForColumn('name', 'name-asc'), 'name-desc');
  assert.equal(nextSortKeyForColumn('name', 'name-desc'), 'name-asc');
  assert.equal(nextSortKeyForColumn('type', 'type-asc'), 'type-desc');
  assert.equal(nextSortKeyForColumn('added', 'added-desc'), 'added-asc');
});

test('nextSortKeyForColumn uses a per-column default when switching columns', () => {
  // name/type default to ascending A–Z...
  assert.equal(nextSortKeyForColumn('name', 'added-desc'), 'name-asc');
  assert.equal(nextSortKeyForColumn('type', 'name-asc'), 'type-asc');
  // ...added defaults to descending (newest first).
  assert.equal(nextSortKeyForColumn('added', 'name-asc'), 'added-desc');
});

// --- sortCatalogObjects ----------------------------------------------------

test('sortCatalogObjects sorts by name ascending/descending', () => {
  const rows = [obj({ name: 'Beta' }), obj({ name: 'alpha' }), obj({ name: 'Gamma' })];
  assert.deepEqual(
    sortCatalogObjects(rows, 'name-asc').map((r) => r.name),
    ['alpha', 'Beta', 'Gamma'],
  );
  assert.deepEqual(
    sortCatalogObjects(rows, 'name-desc').map((r) => r.name),
    ['Gamma', 'Beta', 'alpha'],
  );
});

test('sortCatalogObjects sorts by added date', () => {
  const rows = [
    obj({ name: 'old', createdAt: '2020-01-01T00:00:00.000Z' }),
    obj({ name: 'new', createdAt: '2024-06-01T00:00:00.000Z' }),
    obj({ name: 'mid', createdAt: '2022-03-01T00:00:00.000Z' }),
  ];
  assert.deepEqual(
    sortCatalogObjects(rows, 'added-desc').map((r) => r.name),
    ['new', 'mid', 'old'],
  );
  assert.deepEqual(
    sortCatalogObjects(rows, 'added-asc').map((r) => r.name),
    ['old', 'mid', 'new'],
  );
});

test('sortCatalogObjects type sort flips order and breaks ties by name', () => {
  const rows = [
    obj({ name: 'Zebra', kind: 'song' }), // type label "Song"
    obj({ name: 'Apple', kind: 'album' }), // "Album"
    obj({ name: 'Banana', kind: 'song' }), // "Song"
  ];
  // asc: Album < Song; within Song, Apple/Banana/Zebra by name.
  assert.deepEqual(
    sortCatalogObjects(rows, 'type-asc').map((r) => r.name),
    ['Apple', 'Banana', 'Zebra'],
  );
  // desc: Song group first (name tie-break still ascending), then Album.
  assert.deepEqual(
    sortCatalogObjects(rows, 'type-desc').map((r) => r.name),
    ['Banana', 'Zebra', 'Apple'],
  );
});

test('sortCatalogObjects does not mutate its input', () => {
  const rows = [obj({ name: 'B' }), obj({ name: 'A' })];
  const before = rows.map((r) => r.name);
  sortCatalogObjects(rows, 'name-asc');
  assert.deepEqual(rows.map((r) => r.name), before);
});

// Type guard: keep the public key union in sync with what the UI can produce.
const _allKeys: CatalogSortKey[] = ['name-asc', 'name-desc', 'added-desc', 'added-asc', 'type-asc', 'type-desc'];
void _allKeys;

// --- toggleLibraryFilter / filterCatalogObjects ----------------------------

const ALL: Artist2LibraryFilter = { ...ARTIST2_LIBRARY_FILTER_ALL };

test('toggleLibraryFilter: All clears kind toggles', () => {
  const mixed: Artist2LibraryFilter = {
    all: false,
    songs: true,
    containers: true,
    content: false,
  };
  assert.deepEqual(toggleLibraryFilter(mixed, 'all'), ALL);
});

test('toggleLibraryFilter: kind from All becomes a single-kind filter', () => {
  assert.deepEqual(toggleLibraryFilter(ALL, 'songs'), {
    all: false,
    songs: true,
    containers: false,
    content: false,
  });
});

test('toggleLibraryFilter: two kinds can be on together', () => {
  const songsOnly: Artist2LibraryFilter = {
    all: false,
    songs: true,
    containers: false,
    content: false,
  };
  assert.deepEqual(toggleLibraryFilter(songsOnly, 'content'), {
    all: false,
    songs: true,
    containers: false,
    content: true,
  });
});

test('toggleLibraryFilter: all three kinds collapse back to All', () => {
  const two: Artist2LibraryFilter = {
    all: false,
    songs: true,
    containers: true,
    content: false,
  };
  assert.deepEqual(toggleLibraryFilter(two, 'content'), ALL);
});

test('toggleLibraryFilter: turning off the last kind falls back to All', () => {
  const songsOnly: Artist2LibraryFilter = {
    all: false,
    songs: true,
    containers: false,
    content: false,
  };
  assert.deepEqual(toggleLibraryFilter(songsOnly, 'songs'), ALL);
});

test('filterCatalogObjects searches within the active kind filter', () => {
  const rows = [
    obj({ name: 'Night Song', kind: 'song' }),
    obj({ name: 'Night Album', kind: 'album' }),
    obj({ name: 'Day Song', kind: 'song' }),
    obj({ name: 'Night Image', kind: 'content', contentType: 'image' }),
  ];
  const songsAndContent: Artist2LibraryFilter = {
    all: false,
    songs: true,
    containers: false,
    content: true,
  };
  assert.deepEqual(
    filterCatalogObjects(rows, songsAndContent, 'night').map((r) => r.name),
    ['Night Song', 'Night Image'],
  );
});

test('catalogObjectHasRecording is true only for songs with an audio file', () => {
  assert.equal(catalogObjectHasRecording(obj({ kind: 'album' })), false);
  assert.equal(catalogObjectHasRecording(obj({ kind: 'song', payload: {} })), false);
  assert.equal(
    catalogObjectHasRecording(
      obj({
        kind: 'song',
        payload: {
          recordings: [{ id: 'r1', audioPath: '/tmp/a.mp3', primary: true }],
        },
      }),
    ),
    true,
  );
  assert.equal(
    catalogObjectHasRecording(
      obj({
        kind: 'song',
        payload: { recording: { audioPath: '/tmp/legacy.mp3' } },
      }),
    ),
    true,
  );
});
