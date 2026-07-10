import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  enrichVcStatePayload,
  resolveHostGraphicPopupUrl,
  findGraphicMediaPath,
} = require('../electron/vcStateEnrich.js');

test('resolveHostGraphicPopupUrl returns null without popup id', () => {
  assert.equal(resolveHostGraphicPopupUrl({ hostGraphicPopupId: null }), null);
  assert.equal(resolveHostGraphicPopupUrl({}), null);
});

test('findGraphicMediaPath resolves a graphic item from the host catalog', () => {
  const catalog = {
    items: [
      { id: 'fallback-1', type: 'fallback', slotId: 'slot-1' },
      { id: 'graphic-1', type: 'graphic', mediaPath: 'media/host.png' },
    ],
  };
  assert.equal(findGraphicMediaPath(catalog, 'graphic-1'), 'media/host.png');
  assert.equal(findGraphicMediaPath(catalog, 'missing'), null);
});

test('enrichVcStatePayload leaves payload unchanged without popup id', () => {
  const payload = {
    config: { hostGraphicPopupId: null },
    hostGraphicUrl: null,
  };
  assert.equal(enrichVcStatePayload(payload), payload);
});
