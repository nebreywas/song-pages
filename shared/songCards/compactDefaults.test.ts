/**
 * Smoke tests for Compact Rectangle defaults.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPACT_RECTANGLE_DESIGN_IDS,
  defaultCompactRectangleStructure,
  structureForCompactDesign,
} from './compactDefaults.ts';

describe('compact rectangle structure', () => {
  it('default is Editorial Light with cover left', () => {
    const s = defaultCompactRectangleStructure();
    assert.equal(s.designId, 1);
    assert.equal(s.coverSide, 'left');
    assert.equal(s.playPlacement, 'lower-left');
    assert.equal(s.info.showCaption, true);
    assert.ok(s.footer.center.length <= 4);
  });

  it('Signal Dark flips cover to the right and favors lyric quote', () => {
    const s = structureForCompactDesign(2);
    assert.equal(s.coverSide, 'right');
    assert.equal(s.info.showLyricQuote, true);
    assert.equal(s.info.showCaption, false);
  });

  it('structureForCompactDesign stamps designId', () => {
    for (const id of COMPACT_RECTANGLE_DESIGN_IDS) {
      assert.equal(structureForCompactDesign(id).designId, id);
    }
  });
});
