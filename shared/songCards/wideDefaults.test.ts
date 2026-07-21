/**
 * Smoke tests for Wide Song Card defaults.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WIDE_SONG_CARD_DESIGN_IDS,
  defaultWideSongCardStructure,
  structureForWideDesign,
} from './wideDefaults.ts';

describe('wide song card structure', () => {
  it('default is Classic Info Row with waveform highlight', () => {
    const s = defaultWideSongCardStructure();
    assert.equal(s.designId, 1);
    assert.equal(s.highlights.feature, 'waveform');
    assert.equal(s.showTrackNumber, true);
    assert.equal(s.coverSize, 'md');
  });

  it('Artwork Emphasis uses large cover and metadata grid', () => {
    const s = structureForWideDesign(3);
    assert.equal(s.coverSize, 'lg');
    assert.equal(s.highlights.feature, 'metadata-grid');
  });

  it('Lyrics Preview puts play in the tail', () => {
    assert.equal(structureForWideDesign(4).playPlacement, 'tail');
    assert.equal(structureForWideDesign(4).highlights.feature, 'lyric-quote');
  });

  it('structureForWideDesign stamps designId', () => {
    for (const id of WIDE_SONG_CARD_DESIGN_IDS) {
      assert.equal(structureForWideDesign(id).designId, id);
    }
  });
});
