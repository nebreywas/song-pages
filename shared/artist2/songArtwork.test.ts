import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyLegacyArtworkToEntries,
  ensureSinglePrimaryArtwork,
  legacyArtworkFromEntries,
  normalizeSongArtwork,
  primaryArtworkRef,
  resolvePrimaryArtworkPath,
  setPrimaryArtwork,
} from './songArtwork.ts';

describe('normalizeSongArtwork', () => {
  it('migrates legacy single artwork into a primary entry', () => {
    const entries = normalizeSongArtwork({
      artwork: { mode: 'inline', path: '/tmp/cover.png' },
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].role, 'primary_cover');
    assert.equal(entries[0].source.mode, 'inline');
  });

  it('ignores empty inline placeholders', () => {
    assert.equal(
      normalizeSongArtwork({ artwork: { mode: 'inline', path: null } }).length,
      0,
    );
  });
});

describe('ensureSinglePrimaryArtwork / setPrimaryArtwork', () => {
  it('keeps exactly one primary and sorts it first', () => {
    const entries = ensureSinglePrimaryArtwork([
      {
        id: 'a',
        role: 'additional_image',
        source: { mode: 'inline', path: '/a.png' },
        sortOrder: 20,
      },
      {
        id: 'b',
        role: 'primary_cover',
        source: { mode: 'inline', path: '/b.png' },
        sortOrder: 10,
      },
      {
        id: 'c',
        role: 'primary_cover',
        source: { mode: 'inline', path: '/c.png' },
        sortOrder: 5,
      },
    ]);
    assert.equal(entries.filter((e) => e.role === 'primary_cover').length, 1);
    assert.equal(entries[0].id, 'b');
  });

  it('switches primary cover', () => {
    const next = setPrimaryArtwork(
      [
        {
          id: 'a',
          role: 'primary_cover',
          source: { mode: 'inline', path: '/a.png' },
          sortOrder: 0,
        },
        {
          id: 'b',
          role: 'additional_cover',
          source: { mode: 'inline', path: '/b.png' },
          sortOrder: 10,
        },
      ],
      'b',
    );
    assert.equal(next[0].id, 'b');
    assert.equal(next[0].role, 'primary_cover');
    assert.equal(next[1].role, 'additional_cover');
  });
});

describe('legacy mirror', () => {
  it('mirrors primary into legacy artwork field', () => {
    const legacy = legacyArtworkFromEntries([
      {
        id: 'a',
        role: 'additional_image',
        source: { mode: 'inline', path: '/extra.png' },
        sortOrder: 10,
      },
      {
        id: 'b',
        role: 'primary_cover',
        source: { mode: 'contentRef', contentId: 'c1' },
        sortOrder: 0,
      },
    ]);
    assert.deepEqual(legacy, { mode: 'contentRef', contentId: 'c1' });
  });

  it('applies legacy patch onto primary entry', () => {
    const next = applyLegacyArtworkToEntries(
      [
        {
          id: 'a',
          role: 'primary_cover',
          source: { mode: 'inline', path: '/old.png' },
          sortOrder: 0,
        },
      ],
      { mode: 'inline', path: '/new.png' },
    );
    assert.equal(next[0].source.mode, 'inline');
    assert.equal(next[0].source.mode === 'inline' ? next[0].source.path : null, '/new.png');
  });
});

describe('resolvePrimaryArtworkPath', () => {
  it('resolves contentRef primary covers', () => {
    const path = resolvePrimaryArtworkPath(
      {
        artworkEntries: [
          {
            id: 'a',
            role: 'primary_cover',
            source: { mode: 'contentRef', contentId: 'c1' },
            sortOrder: 0,
          },
        ],
      },
      new Map([
        [
          'c1',
          {
            id: 'c1',
            kind: 'content',
            contentType: 'image',
            payload: { filePath: '/shared.png' },
          } as never,
        ],
      ]),
    );
    assert.equal(path, '/shared.png');
    assert.equal(
      primaryArtworkRef({
        artworkEntries: [
          {
            id: 'a',
            role: 'primary_cover',
            source: { mode: 'contentRef', contentId: 'c1' },
            sortOrder: 0,
          },
        ],
      })?.mode,
      'contentRef',
    );
  });
});
