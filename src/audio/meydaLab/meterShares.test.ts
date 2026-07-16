import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { meterSharesFromFrequency } from './meterShares';

describe('meydaLab meterShares', () => {
  it('attributes low bins to bass share', () => {
    const data = new Uint8Array(64);
    for (let i = 0; i < 4; i += 1) data[i] = 220;
    for (let i = 40; i < 50; i += 1) data[i] = 40;
    const shares = meterSharesFromFrequency(data);
    assert.ok(shares.bassShare > shares.trebleShare);
    assert.ok(shares.overall > 0);
  });
});
