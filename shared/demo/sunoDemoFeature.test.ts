import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSunoDemoSong,
  isSunoDemoSongId,
  SUNO_DEMO_SONG_ID_BASE,
  sunoShareUrlFromClipUuid,
} from './sunoDemoFeature';
import { userPlaylistSongIdFromEntryId } from '../listener/userPlaylists';

test('sunoShareUrlFromClipUuid builds canonical suno.com song links', () => {
  assert.equal(
    sunoShareUrlFromClipUuid('173e6315-42fd-4ddb-b2bf-b3645aed2f86'),
    'https://suno.com/song/173e6315-42fd-4ddb-b2bf-b3645aed2f86',
  );
  assert.equal(sunoShareUrlFromClipUuid('not-a-uuid'), null);
});

test('isSunoDemoSong matches demo playback scope', () => {
  assert.equal(isSunoDemoSong({ id: 1, playback_scope: 'suno-demo' }), true);
});

test('isSunoDemoSongId excludes custom playlist entry ids', () => {
  const customPlaylistSongId = userPlaylistSongIdFromEntryId(10);
  assert.ok(customPlaylistSongId < SUNO_DEMO_SONG_ID_BASE);
  assert.equal(isSunoDemoSongId(customPlaylistSongId), false);
  assert.equal(isSunoDemoSong({ id: customPlaylistSongId, playback_scope: 'full' }), false);
  assert.equal(isSunoDemoSongId(SUNO_DEMO_SONG_ID_BASE - 1), true);
});

test('isSunoDemoSong matches Suno snapshots copied into custom playlists', () => {
  const customPlaylistSongId = userPlaylistSongIdFromEntryId(10);
  assert.equal(
    isSunoDemoSong({
      id: customPlaylistSongId,
      playback_scope: 'suno-demo',
      page_url: 'songpages-suno-demo:page/-2000001',
    }),
    true,
  );
});
