/**
 * Playlist insert-context + payload helper smoke tests.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  albumIncompleteHints,
  playlistAbout,
  playlistProducerCredit,
} from './types.ts';
import {
  buildInsertContext,
  canInsertObject,
  resolveInsertAction,
} from '../../src/artist2/insertContext.ts';

test('playlistAbout / producerCredit fall back to legacy fields', () => {
  assert.equal(playlistAbout({ description: 'legacy' }), 'legacy');
  assert.equal(playlistAbout({ about: 'new', description: 'legacy' }), 'new');
  assert.equal(playlistProducerCredit({ curator: 'Ben' }), 'Ben');
  assert.equal(playlistProducerCredit({ producerCredit: 'Curated by Ben', curator: 'X' }), 'Curated by Ben');
});

test('playlist incomplete hints say No music yet', () => {
  const hints = albumIncompleteHints(
    { kind: 'playlist', payload: {}, id: 'p', artistId: 'a', name: 'P', status: 'draft', contentType: null, createdAt: '', updatedAt: '', deletedAt: null } as never,
    0,
  );
  assert.ok(hints.some((h) => h.label === 'No music yet'));
});

test('playlist insert context accepts songs and albums, not playlists', () => {
  const playlist = {
    id: 'p1',
    kind: 'playlist' as const,
    name: 'P',
    payload: {},
    artistId: 'a',
    status: 'draft' as const,
    contentType: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
  };
  const ctx = buildInsertContext({
    selected: playlist,
    albumDetail: { id: 'p1', kind: 'playlist', tracks: [] },
  });
  const song = { ...playlist, id: 's1', kind: 'song' as const, name: 'S' };
  const album = { ...playlist, id: 'a1', kind: 'album' as const, name: 'A' };
  const other = { ...playlist, id: 'p2', kind: 'playlist' as const, name: 'P2' };

  assert.equal(canInsertObject(song, ctx), true);
  assert.equal(resolveInsertAction(song, ctx), 'container-track');
  assert.equal(canInsertObject(album, ctx), true);
  assert.equal(resolveInsertAction(album, ctx), 'container-track');
  assert.equal(canInsertObject(other, ctx), false);
  assert.equal(resolveInsertAction(other, ctx), null);
});
