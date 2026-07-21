/**
 * Smoke tests for Song Chip type defaults.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SONG_CHIP_TYPE_IDS,
  structureForChipType,
} from './index.ts';

describe('songChips structure', () => {
  it('inline mention has no cover and optional play', () => {
    const s = structureForChipType('inline-mention');
    assert.equal(s.coverShape, 'none');
    assert.equal(s.showPlay, true);
    assert.equal(s.metaField, 'none');
  });

  it('row chip enables menu + length', () => {
    const s = structureForChipType('row');
    assert.equal(s.showMenu, true);
    assert.equal(s.showLength, true);
    assert.equal(s.showArtist, true);
  });

  it('structureForChipType stamps typeId', () => {
    for (const id of SONG_CHIP_TYPE_IDS) {
      assert.equal(structureForChipType(id).typeId, id);
    }
  });
});
