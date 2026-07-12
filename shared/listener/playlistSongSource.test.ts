import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SUNO_DEMO_PLAYBACK_SCOPE } from '../demo/sunoDemoFeature.ts';
import { FLOW_PLAYBACK_SCOPE } from '../flow/flowFeature.ts';
import { SOUNDCLOUD_PLAYBACK_SCOPE } from '../soundcloud/soundcloudFeature.ts';
import { YOUTUBE_PLAYBACK_SCOPE } from '../youtube/youtubeFeature.ts';
import { resolvePlaylistSongSource } from './playlistSongSource.ts';

test('resolvePlaylistSongSource maps third-party playback scopes', () => {
  assert.equal(
    resolvePlaylistSongSource({ id: -3_000_001, playback_scope: SUNO_DEMO_PLAYBACK_SCOPE }).abbrev,
    'SU',
  );
  assert.equal(
    resolvePlaylistSongSource({ id: -3_000_002, playback_scope: YOUTUBE_PLAYBACK_SCOPE }).abbrev,
    'YT',
  );
  assert.equal(
    resolvePlaylistSongSource({ id: -3_000_003, playback_scope: FLOW_PLAYBACK_SCOPE }).abbrev,
    'FM',
  );
  assert.equal(
    resolvePlaylistSongSource({ id: -3_000_004, playback_scope: SOUNDCLOUD_PLAYBACK_SCOPE }).abbrev,
    'SC',
  );
});

test('resolvePlaylistSongSource defaults to Song Pages for catalog snapshots', () => {
  const source = resolvePlaylistSongSource({
    id: -3_000_010,
    page_url: 'https://example.com/songs/track-one',
    playback_scope: 'full',
  });
  assert.equal(source.id, 'song-pages');
  assert.equal(source.label, 'Song Pages');
  assert.equal(source.abbrev, 'SP');
});
