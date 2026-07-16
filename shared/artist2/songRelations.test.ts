import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeSongRelations,
  removeSongRelation,
  songRelationLabel,
  upsertSongRelation,
} from './songRelations.ts';

describe('songRelations', () => {
  it('normalizes and dedupes related song entries', () => {
    const list = normalizeSongRelations([
      { songId: 'a', relation: 'sister' },
      { songId: 'a', relation: 'remix' },
      { songId: 'b', relation: 'nope' },
      { songId: '', relation: 'sister' },
    ]);
    assert.equal(list.length, 2);
    assert.equal(list[0].relation, 'sister');
    assert.equal(list[1].relation, 'sister');
    assert.equal(songRelationLabel('sister'), 'Sister Song');
  });

  it('upserts and removes relations', () => {
    let list = upsertSongRelation([], { songId: 'x', relation: 'remix' });
    list = upsertSongRelation(list, { songId: 'x', relation: 'sequel' });
    assert.equal(list.length, 1);
    assert.equal(list[0].relation, 'sequel');
    list = removeSongRelation(list, 'x');
    assert.equal(list.length, 0);
  });
});
