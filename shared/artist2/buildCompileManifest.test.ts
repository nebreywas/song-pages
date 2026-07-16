import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { albumNameBySongId, buildArtist2CompileManifest } from './buildCompileManifest';
import type { Artist2Artist, Artist2CatalogObject, Artist2Membership } from './types';

const artist: Artist2Artist = {
  id: 'a1',
  name: 'Test Artist',
  createdAt: '',
  updatedAt: '',
  payload: {
    bio: 'Bio text',
    links: { website: 'https://example.com', instagram: '@test' },
    slug: 'test-artist',
  },
};

function song(overrides: Partial<Artist2CatalogObject> = {}): Artist2CatalogObject {
  return {
    id: 's1',
    artistId: 'a1',
    kind: 'song',
    contentType: null,
    name: 'Night Song',
    status: 'draft',
    createdAt: '',
    updatedAt: '',
    payload: {
      recording: { audioPath: '/tmp/night.mp3' },
      artwork: { mode: 'inline', path: '/tmp/cover.png' },
      year: '2025',
      caption: 'Card line',
      about: 'Long public about',
      notes: 'Private — must not compile',
      lyrics: 'La la la',
    },
    ...overrides,
  };
}

describe('buildArtist2CompileManifest', () => {
  it('maps songs with audio and skips deleted / no-audio', () => {
    const result = buildArtist2CompileManifest({
      artist,
      songs: [
        song(),
        song({ id: 's2', name: 'Silent', payload: { recording: { audioPath: null } } }),
        song({ id: 's3', name: 'Gone', deletedAt: '2026-01-01T00:00:00.000Z' }),
      ],
      albums: [{ id: 'alb1', artistId: 'a1', kind: 'album', contentType: null, name: 'Best Of', status: 'draft', createdAt: '', updatedAt: '', payload: {} }],
      content: [],
      memberships: [{ id: 'm1', containerId: 'alb1', memberId: 's1', position: 0, payload: {} }],
    });

    assert.equal(result.manifest.songs.length, 1);
    assert.equal(result.manifest.songs[0].title, 'Night Song');
    assert.equal(result.manifest.songs[0].slug, 'night-song');
    assert.equal(result.manifest.songs[0].caption, 'Card line');
    assert.equal(result.manifest.songs[0].about, 'Long public about');
    assert.equal(result.manifest.songs[0].album, 'Best Of');
    assert.equal(result.manifest.songs[0].coverLocalPath, '/tmp/cover.png');
    assert.equal(result.skippedSongs.length, 2);
  });

  it('uses payload.slug when set and never publishes notes', () => {
    const result = buildArtist2CompileManifest({
      artist,
      songs: [
        song({
          payload: {
            recording: { audioPath: '/tmp/night.mp3' },
            slug: 'custom-url',
            caption: 'Cap',
            about: 'About',
            notes: 'Secret notes',
            description: 'Legacy description ignored',
            linkEntries: [
              {
                id: 'l1',
                kind: 'song_pages',
                visibility: 'public',
                sortOrder: 0,
                songPagesState: 'not_published',
              },
              {
                id: 'l2',
                kind: 'streaming',
                providerId: 'youtube',
                url: 'https://youtube.com/watch?v=abc',
                visibility: 'public',
                sortOrder: 10,
              },
              {
                id: 'l3',
                kind: 'streaming',
                providerId: 'spotify',
                url: 'https://open.spotify.com/track/secret',
                visibility: 'private',
                sortOrder: 20,
              },
            ],
          },
        }),
      ],
      albums: [],
      content: [],
      memberships: [],
    });

    assert.equal(result.manifest.songs[0].slug, 'custom-url');
    assert.equal(result.manifest.songs[0].caption, 'Cap');
    assert.equal(result.manifest.songs[0].about, 'About');
    assert.equal(result.manifest.songs[0].links.youtube, 'https://youtube.com/watch?v=abc');
    assert.equal(result.manifest.songs[0].links.spotify, '');
    const serialized = JSON.stringify(result.manifest.songs[0]);
    assert.equal(serialized.includes('Secret notes'), false);
    assert.equal(serialized.includes('Legacy description ignored'), false);
  });

  it('uses the published recording when multiple format variants exist', () => {
    const result = buildArtist2CompileManifest({
      artist,
      songs: [
        song({
          payload: {
            recordings: [
              { id: 'r1', audioPath: '/tmp/night.wav', published: false },
              { id: 'r2', audioPath: '/tmp/night-384.mp3', published: true },
            ],
            artwork: { mode: 'inline', path: '/tmp/cover.png' },
          },
        }),
      ],
      albums: [],
      content: [],
      memberships: [],
    });

    assert.equal(result.manifest.songs.length, 1);
    assert.equal(result.manifest.songs[0].audioLocalPath, '/tmp/night-384.mp3');
  });

  it('resolves artwork from content reference', () => {
    const result = buildArtist2CompileManifest({
      artist,
      songs: [
        song({
          payload: {
            recording: { audioPath: '/tmp/a.mp3' },
            artwork: { mode: 'contentRef', contentId: 'c1' },
          },
        }),
      ],
      albums: [],
      content: [
        {
          id: 'c1',
          artistId: 'a1',
          kind: 'content',
          contentType: 'image',
          name: 'Cover',
          status: 'draft',
          createdAt: '',
          updatedAt: '',
          payload: { filePath: '/tmp/shared.png' },
        },
      ],
      memberships: [],
    });

    assert.equal(result.manifest.songs[0].coverLocalPath, '/tmp/shared.png');
  });
});

describe('albumNameBySongId', () => {
  it('picks lexicographically first album when song is on multiple', () => {
    const albums = new Map<string, Artist2CatalogObject>([
      ['a', { id: 'a', name: 'Zebra', kind: 'album' } as Artist2CatalogObject],
      ['b', { id: 'b', name: 'Alpha', kind: 'album' } as Artist2CatalogObject],
    ]);
    const memberships: Artist2Membership[] = [
      { id: 'm1', containerId: 'a', memberId: 's1', position: 0, payload: {} },
      { id: 'm2', containerId: 'b', memberId: 's1', position: 0, payload: {} },
    ];
    const map = albumNameBySongId(memberships, albums);
    assert.equal(map.get('s1'), 'Alpha');
  });
});
