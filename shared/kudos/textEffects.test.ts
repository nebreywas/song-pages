import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeTextEffectFrame } from '../../src/kudos/text/effects';

test('computeTextEffectFrame drop starts above rest position', () => {
  const start = computeTextEffectFrame('drop', 'WOW!', 0);
  const end = computeTextEffectFrame('drop', 'WOW!', 0.5);
  assert.match(start.transform, /translateY\(-/);
  assert.match(end.transform, /translateY\(0px\)/);
});

test('computeTextEffectFrame wave exposes per-grapheme offsets', () => {
  const frame = computeTextEffectFrame('wave', 'HI!', 0.35);
  assert.equal(frame.graphemeOffsets?.length, 3);
});

test('computeTextEffectFrame stamp scales down on landing', () => {
  const start = computeTextEffectFrame('stamp', 'YES!', 0);
  assert.match(start.transform, /scale\(2/);
});
