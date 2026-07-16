import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatVcSongUrlDisplay, VC_SOURCE_TITLE_LABELS } from './songSourceDisplay.ts';

test('formatVcSongUrlDisplay strips https by default', () => {
  assert.equal(
    formatVcSongUrlDisplay('https://www.youtube.com/watch?v=abc123', {
      rootOnly: false,
      includeHttps: false,
    }),
    'www.youtube.com/watch?v=abc123',
  );
});

test('formatVcSongUrlDisplay can keep https and root-only host', () => {
  assert.equal(
    formatVcSongUrlDisplay('https://suno.com/song/uuid-here', {
      rootOnly: true,
      includeHttps: false,
    }),
    'suno.com',
  );
  assert.equal(
    formatVcSongUrlDisplay('https://suno.com/song/uuid-here', {
      rootOnly: true,
      includeHttps: true,
    }),
    'https://suno.com',
  );
});

test('VC source titles use Artist Page for Song Pages catalog', () => {
  assert.equal(VC_SOURCE_TITLE_LABELS['song-pages'], 'Artist Page');
  assert.equal(VC_SOURCE_TITLE_LABELS.youtube, 'YouTube');
});
