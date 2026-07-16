import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSongSlug, slugifySongName } from './songSlug.ts';

describe('slugifySongName', () => {
  it('normalizes punctuation and case', () => {
    assert.equal(slugifySongName('Night Almighty!'), 'night-almighty');
    assert.equal(slugifySongName('  Hello   World  '), 'hello-world');
  });

  it('falls back when empty', () => {
    assert.equal(slugifySongName(''), 'song');
    assert.equal(slugifySongName('!!!'), 'song');
  });
});

describe('resolveSongSlug', () => {
  it('prefers explicit slug over derived name', () => {
    assert.equal(resolveSongSlug({ name: 'Night Song', slug: 'custom' }), 'custom');
    assert.equal(resolveSongSlug({ name: 'Night Song', slug: '  ' }), 'night-song');
  });
});
