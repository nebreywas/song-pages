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

  it('allows YouTube oEmbed endpoint for metadata intake', () => {
    const result = validateRemoteUrl(
      'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc&format=json',
      { purpose: 'youtube-oembed', provenance: { kind: 'youtube-oembed', videoId: 'abc' } },
    );
    assert.equal(result.ok, true);
  });

  it('denies non-oEmbed YouTube URLs for metadata intake', () => {
    const result = validateRemoteUrl('https://www.youtube.com/watch?v=abc', {
      purpose: 'youtube-oembed',
      provenance: { kind: 'youtube-oembed', videoId: 'abc' },
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'URL_HOST');
  });

  it('allows SoundCloud oEmbed endpoint for metadata intake', () => {
    const result = validateRemoteUrl(
      'https://soundcloud.com/oembed?format=json&url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb',
      { purpose: 'soundcloud-oembed', provenance: { kind: 'soundcloud-oembed', permalink: 'x' } },
    );
    assert.equal(result.ok, true);
  });

  it('allows SoundCloud short links and track landings for redirect resolve', () => {
    const short = validateRemoteUrl('https://on.soundcloud.com/abc', {
      purpose: 'soundcloud-shortlink',
      provenance: { kind: 'soundcloud-shortlink' },
    });
    assert.equal(short.ok, true);

    const track = validateRemoteUrl('https://soundcloud.com/forss/flickermood', {
      purpose: 'soundcloud-shortlink',
      provenance: { kind: 'soundcloud-shortlink' },
    });
    assert.equal(track.ok, true);

    const profile = validateRemoteUrl('https://soundcloud.com/forss', {
      purpose: 'soundcloud-shortlink',
      provenance: { kind: 'soundcloud-shortlink' },
    });
    assert.equal(profile.ok, false);
  });

  it('allows public Flow song pages for metadata intake', () => {
    const result = validateRemoteUrl(
      'https://www.flowmusic.app/song/57d4ab70-3279-4175-b327-c56d1df6a298',
      { purpose: 'flow-song-page', provenance: 'user-initiated' },
    );
    assert.equal(result.ok, true);
  });

  it('allows public Flow GCS clips and rejects private buckets', () => {
    const publicClip = validateRemoteUrl(
      'https://storage.googleapis.com/producer-app-public/clips/57d4ab70-3279-4175-b327-c56d1df6a298.m4a',
      { purpose: 'flow-public-clip', provenance: 'user-initiated' },
    );
    assert.equal(publicClip.ok, true);

    const privateClip = validateRemoteUrl(
      'https://storage.googleapis.com/producer-app-private/clips/57d4ab70-3279-4175-b327-c56d1df6a298.m4a',
      { purpose: 'flow-public-clip', provenance: 'user-initiated' },
    );
    assert.equal(privateClip.ok, false);
  });
});
