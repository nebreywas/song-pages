/**
 * Unit tests for Album↔Album relation helpers.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  albumRelationLabel,
  normalizeAlbumRelations,
  removeAlbumRelation,
  upsertAlbumRelation,
} from './albumRelations.ts';
import { albumAbout, albumCreationDate } from './types.ts';

test('normalizeAlbumRelations drops duplicates and unknown kinds', () => {
  const rows = normalizeAlbumRelations([
    { albumId: 'a1', relation: 'deluxe' },
    { albumId: 'a1', relation: 'sister' },
    { albumId: 'a2', relation: 'not-a-kind' },
    { albumId: '', relation: 'sister' },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.albumId, 'a1');
  assert.equal(rows[0]?.relation, 'deluxe');
  assert.equal(rows[1]?.relation, 'sister');
});

test('upsert and remove album relations', () => {
  let list = upsertAlbumRelation([], { albumId: 'x', relation: 'sister' });
  list = upsertAlbumRelation(list, { albumId: 'x', relation: 'reissue' });
  assert.equal(list.length, 1);
  assert.equal(list[0]?.relation, 'reissue');
  list = removeAlbumRelation(list, 'x');
  assert.equal(list.length, 0);
});

test('albumRelationLabel covers sister', () => {
  assert.equal(albumRelationLabel('sister'), 'Sister Album');
});

test('albumCreationDate prefers creationDate over releaseDate', () => {
  assert.equal(albumCreationDate({ creationDate: '2026', releaseDate: '1999' }), '2026');
  assert.equal(albumCreationDate({ releaseDate: '07/2025' }), '07/2025');
});

test('albumAbout prefers about over description', () => {
  assert.equal(albumAbout({ about: 'New', description: 'Old' }), 'New');
  assert.equal(albumAbout({ description: 'Legacy' }), 'Legacy');
});
