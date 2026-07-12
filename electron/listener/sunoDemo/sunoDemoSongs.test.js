const assert = require('node:assert/strict');
const { test } = require('node:test');

const { lyricsFromClip, coverFromClip, resolveSunoCoverUrl } = require('./feature');

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
