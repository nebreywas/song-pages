import assert from 'node:assert/strict';
import { test } from 'node:test';

import { firstGrapheme, isSingleGrapheme, sanitizeEmojiElements, segmentGraphemes } from './graphemes';

test('segmentGraphemes treats ZWJ family emoji as one grapheme', () => {
  const family = '👨‍👩‍👧';
  assert.equal(segmentGraphemes(family).length, 1);
  assert.ok(isSingleGrapheme(family));
});

test('firstGrapheme keeps only the first grapheme from pasted input', () => {
  assert.equal(firstGrapheme('🔥💯'), '🔥');
  assert.equal(firstGrapheme('  ⭐  '), '⭐');
});

test('sanitizeEmojiElements dedupes slots and caps at four', () => {
  assert.deepEqual(sanitizeEmojiElements(['❤️', '🔥', '💯', '✨', '👏']), ['❤️', '🔥', '💯', '✨']);
});
