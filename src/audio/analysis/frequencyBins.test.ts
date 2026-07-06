import assert from 'node:assert/strict';
import { test } from 'node:test';

import { measureFrequencyBins } from './frequencyBins.ts';

test('measureFrequencyBins returns silent for empty data', () => {
  const result = measureFrequencyBins(new Uint8Array(0));
  assert.equal(result.peak, 0);
  assert.equal(result.silent, true);
});

test('measureFrequencyBins detects peak and non-silent signal', () => {
  const data = new Uint8Array(128);
  data[10] = 200;
  data[11] = 50;
  const result = measureFrequencyBins(data);
  assert.equal(result.peak, 200);
  assert.equal(result.silent, false);
  assert.ok(result.avg > 0);
});

test('measureFrequencyBins treats near-zero as silent', () => {
  const data = new Uint8Array([0, 1, 0, 2]);
  const result = measureFrequencyBins(data);
  assert.equal(result.silent, true);
});
