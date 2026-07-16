const assert = require('node:assert/strict');
const { test } = require('node:test');

const { lyricsFromClip, coverFromClip, resolveSunoCoverUrl, yearFromClip } = require('./feature');
const {
  metadataFromSunoClip,
  serializeSunoProviderMetadata,
} = require('./clipMetadata');

test('lyricsFromClip prefers metadata.prompt from Suno studio clip payload', () => {
  const clip = {
    metadata: {
      prompt: '[intro]\nYuh… (yuh-yuh)\nYuh-yuh, yuh—yuh-yuh',
    },
  };
  assert.match(lyricsFromClip(clip), /Yuh/);
});

test('lyricsFromClip falls back through alternate Suno lyric fields', () => {
  assert.equal(lyricsFromClip({ prompt: 'From prompt' }), 'From prompt');
  assert.equal(lyricsFromClip({ lyric: 'From lyric' }), 'From lyric');
  assert.equal(lyricsFromClip({}), '');
});

test('yearFromClip reads YYYY from Studio created_at', () => {
  assert.equal(yearFromClip({ created_at: '2026-06-26T04:27:00.000Z' }), '2026');
  assert.equal(yearFromClip({ createdAt: '2024-08-08T00:41:34.493Z' }), '2024');
  assert.equal(yearFromClip({}), null);
  assert.equal(yearFromClip({ created_at: 'not-a-date' }), null);
});

test('coverFromClip uses cdn2 image_large fallback, not legacy cdn1', () => {
  const clipUuid = '39db1ce8-0c42-442f-983e-2c0b983b6826';
  assert.equal(
    coverFromClip({ id: clipUuid, title: 'Brew' }, clipUuid),
    `https://cdn2.suno.ai/image_large_${clipUuid}.jpeg`,
  );
});

test('resolveSunoCoverUrl prefers stored snapshot over canonical CDN pattern', () => {
  const clipUuid = '39db1ce8-0c42-442f-983e-2c0b983b6826';
  const stored = 'https://cdn2.suno.ai/a64ceae8-a92c-4d4a-9081-f6eeec4d5728_e19ce2d2.jpeg';
  assert.equal(
    resolveSunoCoverUrl({ id: clipUuid, title: 'Brew' }, clipUuid, stored),
    stored,
  );
});

test('resolveSunoCoverUrl prefers Suno API image fields over snapshot', () => {
  const api = 'https://cdn2.suno.ai/from-api.jpeg';
  const stored = 'https://cdn2.suno.ai/stored.jpeg';
  assert.equal(resolveSunoCoverUrl({ image_large_url: api }, 'clip-uuid', stored), api);
});

test('metadataFromSunoClip serializes videoCoverUrl key even when null', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-no-cover',
    video_url: 'https://cdn1.suno.ai/clip-no-cover.mp4',
    metadata: {},
  });
  const json = serializeSunoProviderMetadata(meta);
  assert.match(json, /"videoCoverUrl":null/);
  assert.equal(meta.videoCoverUrl, null);
});

test('metadataFromSunoClip maps video_cover_url for animated covers', () => {
  const cover =
    'https://cdn1.suno.ai/video_upload_7f0b49f6-efb4-4a8a-b56e-544371d31b84_processed_video.mp4';
  const meta = metadataFromSunoClip({
    id: '315417d6-d2ea-47bc-a077-993bcc2298d2',
    video_url: 'https://cdn1.suno.ai/315417d6-d2ea-47bc-a077-993bcc2298d2.mp4',
    video_cover_url: cover,
    metadata: {},
  });
  assert.equal(meta.videoCoverUrl, cover);
});
