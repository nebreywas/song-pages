import assert from 'node:assert/strict';
import { test } from 'node:test';

import { firstGrapheme, isSingleGrapheme, sanitizeEmojiElements, segmentGraphemes, truncateToMaxGraphemes } from './graphemes';

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

test('segmentGraphemes preserves internal and trailing spaces for Kudo text', () => {
  assert.deepEqual(segmentGraphemes('HELLO WORLD'), ['H', 'E', 'L', 'L', 'O', ' ', 'W', 'O', 'R', 'L', 'D']);
  assert.equal(segmentGraphemes('NICE JOB ').at(-1), ' ');
});

test('truncateToMaxGraphemes keeps spaces while enforcing the grapheme cap', () => {
  assert.equal(truncateToMaxGraphemes('SO COOL', 7), 'SO COOL');
  assert.equal(truncateToMaxGraphemes('WAY TOO LONG FOR KUDO TEXT', 18), 'WAY TOO LONG FOR K');
});
