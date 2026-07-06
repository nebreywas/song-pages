import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isValidHexColor, normalizeHexColor } from '../../src/components/color/normalizeHex';

test('normalizeHexColor keeps 6-digit hex', () => {
  assert.equal(normalizeHexColor('#AABBCC'), '#aabbcc');
});

test('normalizeHexColor strips alpha channel', () => {
  assert.equal(normalizeHexColor('#aabbccff'), '#aabbcc');
});

test('normalizeHexColor expands 3-digit hex', () => {
  assert.equal(normalizeHexColor('#abc'), '#aabbcc');
});

test('isValidHexColor accepts persisted VC colors', () => {
  assert.equal(isValidHexColor('#5b9fd4'), true);
  assert.equal(isValidHexColor('red'), false);
});
