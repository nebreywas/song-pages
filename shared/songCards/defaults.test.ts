/**
 * Smoke tests for Song Card design defaults / structure helpers.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SONG_CARD_DESIGN_IDS,
  defaultSongCardStructure,
  structureForDesign,
} from './index.ts';

describe('songCards structure', () => {
  it('default structure is Classic (design 1)', () => {
    const s = defaultSongCardStructure();
    assert.equal(s.designId, 1);
    assert.equal(s.corners.bottomLeft, 'play');
    assert.equal(s.corners.bottomRight, 'length');
    assert.equal(s.info.showCaption, false);
    assert.equal(s.footer.left, 'track-number');
    assert.ok(s.coverHeightRatio > 0.3 && s.coverHeightRatio < 0.8);
  });

  it('reference templates diverge on information density', () => {
    assert.equal(structureForDesign(2).info.showSubtitle, true);
    assert.equal(structureForDesign(2).coverBugsPlacement, 'outside');
    assert.equal(structureForDesign(3).info.showCaption, true);
    assert.equal(structureForDesign(3).corners.topRight, 'explicit');
    assert.equal(structureForDesign(3).info.genreThemeRender, 'text');
    assert.equal(structureForDesign(4).info.showLyricQuote, true);
    assert.equal(structureForDesign(5).info.showSubtitle, true);
    assert.equal(structureForDesign(5).coverBlend, 'dark');
    assert.equal(structureForDesign(6).info.showCaption, true);
    assert.equal(structureForDesign(7).info.showThemes, true);
    assert.equal(structureForDesign(7).coverBugsPlacement, 'overlay');
    assert.notEqual(
      structureForDesign(1).coverHeightRatio,
      structureForDesign(4).coverHeightRatio,
    );
  });

  it('structureForDesign stamps the selected designId', () => {
    for (const id of SONG_CARD_DESIGN_IDS) {
      assert.equal(structureForDesign(id).designId, id);
    }
  });
});
