import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSoundcloudSong,
  soundcloudTrackIdFromSong,
  soundcloudPermalinkFromSong,
} from './soundcloudFeature.ts';

describe('soundcloudFeature', () => {
  it('detects soundcloud playlist rows', () => {
    const song = {
      playback_scope: 'soundcloud',
      page_url: 'songpages-soundcloud:track/293',
      external_id: '293',
      playback_url: 'https://soundcloud.com/forss/flickermood',
    };
    assert.equal(isSoundcloudSong(song), true);
    assert.equal(soundcloudTrackIdFromSong(song), '293');
    assert.equal(soundcloudPermalinkFromSong(song), 'https://soundcloud.com/forss/flickermood');
  });
});
