import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimatePhraseWidthEm, kudoTextFontSizePx, peakTextEffectScale } from './textSizing';

test('peakTextEffectScale reserves slam intro headroom', () => {
  assert.equal(peakTextEffectScale('slam'), 2.4);
  assert.equal(peakTextEffectScale('echo'), 1);
});

test('estimatePhraseWidthEm counts emoji wider than letters', () => {
  assert.ok(estimatePhraseWidthEm('LOVE THIS ❤️') > estimatePhraseWidthEm('LOVE THIS'));
});

test('kudoTextFontSizePx shrinks long phrases on narrow surfaces', () => {
  const short = kudoTextFontSizePx(200, 'WOW!', 'echo');
  const long = kudoTextFontSizePx(200, 'LOVE THIS ❤️', 'echo');
  assert.ok(short > long);
});

test('kudoTextFontSizePx shrinks further for slam peak scale', () => {
  const echo = kudoTextFontSizePx(480, 'AWESOME!', 'echo');
  const slam = kudoTextFontSizePx(480, 'AWESOME!', 'slam');
  assert.ok(echo > slam);
});
