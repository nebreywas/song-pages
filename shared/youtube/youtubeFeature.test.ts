import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalizeYoutubeInput } from '../providers/youtube/canonicalize.ts';
import {
  isYoutubeSong,
  parseYoutubeVideoId,
  youtubePageUrl,
  youtubeVideoIdFromSong,
} from './youtubeFeature.ts';

test('parseYoutubeVideoId accepts bare ids and watch URLs', () => {
  assert.equal(parseYoutubeVideoId('ExeQM08TwbE'), 'ExeQM08TwbE');
  assert.equal(
    parseYoutubeVideoId('https://www.youtube.com/watch?v=ExeQM08TwbE&list=RDExeQM08TwbE'),
    'ExeQM08TwbE',
  );
  assert.equal(parseYoutubeVideoId('https://youtu.be/ExeQM08TwbE'), 'ExeQM08TwbE');
});

test('parseYoutubeVideoId rejects invalid input', () => {
  assert.equal(parseYoutubeVideoId(''), null);
  // Bare 11-char [\w-] strings are valid video-id shapes (opaque YouTube ids),
  // so use genuinely invalid input: wrong length and disallowed characters.
  assert.equal(parseYoutubeVideoId('nope'), null);
  assert.equal(parseYoutubeVideoId('not a video!'), null);
});

test('canonicalizeYoutubeInput strips playlist, radio, and timestamp params', () => {
  const result = canonicalizeYoutubeInput(
    'https://www.youtube.com/watch?v=ExeQM08TwbE&list=RDExeQM08TwbE&start_radio=1&t=42',
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.ref.videoId, 'ExeQM08TwbE');
  assert.equal(result.ref.canonicalWatchUrl, 'https://www.youtube.com/watch?v=ExeQM08TwbE');
  assert.equal(result.ref.canonicalPageUrl, youtubePageUrl('ExeQM08TwbE'));
  assert.deepEqual(result.discarded.queryParams, {
    list: 'RDExeQM08TwbE',
    start_radio: '1',
    t: '42',
  });
  assert.ok(result.discarded.notes.some((note) => note.includes('playlist')));
  assert.ok(result.discarded.notes.some((note) => note.includes('start offset')));
});

test('canonicalizeYoutubeInput accepts shorts URLs', () => {
  const result = canonicalizeYoutubeInput('https://www.youtube.com/shorts/ExeQM08TwbE');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.ref.videoId, 'ExeQM08TwbE');
});

test('youtubeVideoIdFromSong reads custom playlist snapshots', () => {
  const videoId = 'ExeQM08TwbE';
  assert.equal(
    youtubeVideoIdFromSong({
      external_id: videoId,
      page_url: youtubePageUrl(videoId),
      playback_url: `https://www.youtube.com/watch?v=${videoId}`,
      playback_scope: 'youtube',
    }),
    videoId,
  );
  assert.equal(isYoutubeSong({ playback_scope: 'youtube', page_url: youtubePageUrl(videoId) }), true);
});
