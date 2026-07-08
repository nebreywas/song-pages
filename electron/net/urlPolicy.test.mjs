import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateRemoteUrl, isPrivateOrLocalAddress } from './urlPolicy.js';

describe('urlPolicy', () => {
  it('allows localhost subscribe for user-initiated catalog fetch', () => {
    const result = validateRemoteUrl('http://192.168.1.10/catalog.json', {
      purpose: 'subscribe-catalog',
      provenance: 'user-initiated',
    });
    assert.equal(result.ok, true);
  });

  it('denies private manifest fetch without catalog context', () => {
    const result = validateRemoteUrl('http://127.0.0.1:8080/song.json', {
      purpose: 'fetch-song-manifest',
      provenance: 'none',
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'URL_PROVENANCE');
  });

  it('allows private manifest fetch with catalog context', () => {
    const result = validateRemoteUrl('http://10.0.0.5/songs/a/song.json', {
      purpose: 'fetch-song-manifest',
      provenance: 'catalog-context',
    });
    assert.equal(result.ok, true);
  });

  it('denies probe without song or catalog context', () => {
    const result = validateRemoteUrl('https://example.com/page.html', {
      purpose: 'probe-song-availability',
      provenance: 'none',
    });
    assert.equal(result.ok, false);
  });

  it('classifies RFC1918 hosts as private', () => {
    assert.equal(isPrivateOrLocalAddress('localhost'), true);
    assert.equal(isPrivateOrLocalAddress('192.168.0.1'), true);
    assert.equal(isPrivateOrLocalAddress('example.com'), false);
  });
});
