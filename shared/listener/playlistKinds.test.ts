import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SUNO_DEMO_ARTIST_ID } from '../demo/sunoDemoFeature.ts';
import { LIKED_SONGS_ARTIST_ID, vcArtistDisplayName } from './playlistKinds.ts';

test('vcArtistDisplayName uses track artist on virtual playlists', () => {
  assert.equal(
    vcArtistDisplayName(
      { id: -2_000_001, artist_id: SUNO_DEMO_ARTIST_ID, artist_name: 'Rocky Hop' },
      { id: SUNO_DEMO_ARTIST_ID, artist_name: 'Suno Only' },
    ),
    'Rocky Hop',
  );
  assert.equal(
    vcArtistDisplayName(
      { id: -1, artist_id: LIKED_SONGS_ARTIST_ID, artist_name: 'Real Artist' },
      { id: LIKED_SONGS_ARTIST_ID, artist_name: 'Liked Songs' },
    ),
    'Real Artist',
  );
});

test('vcArtistDisplayName prefers subscribed artist profile', () => {
  assert.equal(
    vcArtistDisplayName(
      { id: 12, artist_id: 3, artist_name: 'Fallback' },
      { id: 3, artist_name: 'Catalog Artist' },
    ),
    'Catalog Artist',
  );
});

test('vcArtistDisplayName uses manifest fallback on Suno tracks', () => {
  assert.equal(
    vcArtistDisplayName(
      { id: -2_000_001, artist_id: SUNO_DEMO_ARTIST_ID, artist_name: '' },
      { id: SUNO_DEMO_ARTIST_ID, artist_name: 'Suno Only' },
      'Rocky Hop',
    ),
    'Rocky Hop',
  );
});

test('vcArtistDisplayName ignores virtual sidebar artist profile when song is absent', () => {
  assert.equal(vcArtistDisplayName(null, { id: SUNO_DEMO_ARTIST_ID, artist_name: 'Suno Only' }), null);
});
