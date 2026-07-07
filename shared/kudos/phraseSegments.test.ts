import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isEmojiGrapheme, phraseIncludesEmoji, segmentPhrase } from './phraseSegments';

test('isEmojiGrapheme detects pictographic graphemes', () => {
  assert.equal(isEmojiGrapheme('❤️'), true);
  assert.equal(isEmojiGrapheme('A'), false);
});

test('segmentPhrase groups text and emoji runs', () => {
  assert.deepEqual(segmentPhrase('LOVE THIS ❤️'), [
    { kind: 'text', value: 'LOVE THIS ' },
    { kind: 'emoji', value: '❤️' },
  ]);
});

test('phraseIncludesEmoji detects mixed phrases', () => {
  assert.equal(phraseIncludesEmoji('WOW! 🤯'), true);
  assert.equal(phraseIncludesEmoji('AWESOME!'), false);
});
