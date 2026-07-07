import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  lerpKudoHexColor,
  normalizeKudoHexColor,
  resolveParticleIconTint,
  sanitizeKudoColorList,
} from './particleColors';

test('normalizeKudoHexColor normalizes hex colors', () => {
  assert.equal(normalizeKudoHexColor('#abc'), '#aabbcc');
  assert.equal(normalizeKudoHexColor('#ff6b8a'), '#ff6b8a');
  assert.equal(normalizeKudoHexColor('nope'), null);
});

test('lerpKudoHexColor interpolates between two colors', () => {
  assert.equal(lerpKudoHexColor('#000000', '#ffffff', 0.5), '#808080');
});

test('resolveParticleIconTint resolves single and gradient tints', () => {
  assert.equal(resolveParticleIconTint('single', ['#ff0000'], 0, 10), '#ff0000');
  assert.equal(resolveParticleIconTint(undefined, ['#ff0000'], 0, 10), null);
  assert.equal(resolveParticleIconTint('gradient', ['#000000', '#ffffff'], 0, 3), '#000000');
  assert.equal(resolveParticleIconTint('gradient', ['#000000', '#ffffff'], 3, 3), '#ffffff');
});

test('sanitizeKudoColorList sanitizes color lists', () => {
  assert.deepEqual(sanitizeKudoColorList(['#abc', 'bad', '#112233'], 2), ['#aabbcc', '#112233']);
});
