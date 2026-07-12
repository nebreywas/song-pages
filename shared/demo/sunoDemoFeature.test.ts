import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSunoDemoSong,
  isSunoDemoSongId,
  parseSunoPageClipUuid,
  resolveSunoDemoManifestUrl,
  sunoDemoManifestUrlFromClipUuid,
  sunoDemoPageUrlFromClipUuid,
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

test('resolveSunoDemoManifestUrl uses clip UUID for custom-playlist snapshots', () => {
  const clipUuid = '3fe940b3-ea01-4b41-9e39-15b46447b4fb';
  const customPlaylistSongId = userPlaylistSongIdFromEntryId(10);
  assert.equal(
    resolveSunoDemoManifestUrl({
      id: customPlaylistSongId,
      playback_scope: 'suno-demo',
      page_url: sunoDemoPageUrlFromClipUuid(clipUuid),
      external_id: clipUuid,
      song_manifest_url: null,
    }),
    sunoDemoManifestUrlFromClipUuid(clipUuid),
  );
  assert.equal(parseSunoPageClipUuid(sunoDemoPageUrlFromClipUuid(clipUuid)), clipUuid);
});

test('resolveSunoDemoManifestUrl prefers clip UUID page_url over legacy sidebar song id manifest', () => {
  const clipUuid = '3fe940b3-ea01-4b41-9e39-15b46447b4fb';
  const sunoSongId = SUNO_DEMO_SONG_ID_BASE - 1;
  const customPlaylistSongId = userPlaylistSongIdFromEntryId(10);
  assert.equal(
    resolveSunoDemoManifestUrl({
      id: customPlaylistSongId,
      playback_scope: 'suno-demo',
      page_url: sunoDemoPageUrlFromClipUuid(clipUuid),
      song_manifest_url: `songpages-suno-demo:manifest/${sunoSongId}`,
      external_id: clipUuid,
    }),
    sunoDemoManifestUrlFromClipUuid(clipUuid),
  );
});

test('resolveSunoDemoManifestUrl derives manifest URL from legacy sidebar song id page_url', () => {
  const customPlaylistSongId = userPlaylistSongIdFromEntryId(10);
  const sunoSongId = SUNO_DEMO_SONG_ID_BASE - 1;
  assert.equal(
    resolveSunoDemoManifestUrl({
      id: customPlaylistSongId,
      playback_scope: 'suno-demo',
      page_url: `songpages-suno-demo:page/${sunoSongId}`,
      song_manifest_url: null,
      external_id: '3fe940b3-ea01-4b41-9e39-15b46447b4fb',
    }),
    `songpages-suno-demo:manifest/${sunoSongId}`,
  );
});

test('resolveSunoDemoManifestUrl prefers clip page_url over legacy numeric manifest', () => {
  const clipUuid = '3fe940b3-ea01-4b41-9e39-15b46447b4fb';
  const customPlaylistSongId = userPlaylistSongIdFromEntryId(10);
  assert.equal(
    resolveSunoDemoManifestUrl({
      id: customPlaylistSongId,
      playback_scope: 'suno-demo',
      page_url: sunoDemoPageUrlFromClipUuid(clipUuid),
      song_manifest_url: `songpages-suno-demo:manifest/${customPlaylistSongId}`,
      external_id: clipUuid,
    }),
    sunoDemoManifestUrlFromClipUuid(clipUuid),
  );
});
