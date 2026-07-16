import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMediaSessionMetadata } from './mediaSessionAdapter';

test('buildMediaSessionMetadata returns null without a title', () => {
  assert.equal(buildMediaSessionMetadata(null), null);
  assert.equal(buildMediaSessionMetadata({ title: '  ', artist: 'A' }), null);
});

test('buildMediaSessionMetadata includes artwork when provided', () => {
  // MediaMetadata exists in Chromium; under node:test it may be absent.
  if (typeof MediaMetadata === 'undefined') {
    assert.equal(
      buildMediaSessionMetadata({
        title: 'Song',
        artist: 'Artist',
        artworkUrl: 'https://example.com/cover.jpg',
      }),
      null,
    );
    return;
  }

  const meta = buildMediaSessionMetadata({
    title: 'Song',
    artist: 'Artist',
    artworkUrl: 'https://example.com/cover.jpg',
  });
  assert.ok(meta);
  assert.equal(meta?.title, 'Song');
  assert.equal(meta?.artist, 'Artist');
  assert.ok((meta?.artwork?.length ?? 0) > 0);
});
