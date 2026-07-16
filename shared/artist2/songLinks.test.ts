import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compileStreamLinksFromEntries,
  compileStreamLinksFromPayload,
  createEmptyLinkRow,
  isStructurallyValidUrl,
  migrateFlatLinks,
  normalizeSongLinks,
  upsertStreamingLink,
} from './songLinks.ts';
import { providersByCapability } from './providersSocialRegistry.ts';

describe('providersSocialRegistry', () => {
  it('lists streaming and social providers separately', () => {
    const streaming = providersByCapability('streaming');
    const social = providersByCapability('social');
    assert.ok(streaming.some((p) => p.id === 'spotify'));
    assert.ok(streaming.some((p) => p.id === 'suno'));
    assert.ok(social.some((p) => p.id === 'instagram'));
    assert.equal(
      social.some((p) => p.id === 'spotify'),
      false,
    );
  });
});

describe('normalizeSongLinks', () => {
  it('always includes a Song Pages stub', () => {
    const entries = normalizeSongLinks({});
    assert.equal(entries.filter((e) => e.kind === 'song_pages').length, 1);
    assert.equal(entries[0].songPagesState, 'not_published');
  });

  it('migrates flat links when linkEntries are empty', () => {
    const entries = normalizeSongLinks({
      links: {
        youtube: 'https://youtube.com/watch?v=abc',
        spotify: 'https://open.spotify.com/track/1',
        suno: 'https://suno.com/song/x',
      },
    });
    assert.ok(entries.some((e) => e.providerId === 'youtube'));
    assert.ok(entries.some((e) => e.providerId === 'spotify'));
    assert.ok(entries.some((e) => e.providerId === 'suno'));
  });
});

describe('compileStreamLinksFromEntries', () => {
  it('maps public streaming providers and skips private / distribution', () => {
    const links = compileStreamLinksFromEntries([
      {
        id: '1',
        kind: 'song_pages',
        visibility: 'public',
        sortOrder: 0,
        songPagesState: 'preview',
      },
      {
        id: '2',
        kind: 'streaming',
        providerId: 'youtube',
        url: 'https://youtube.com/watch?v=1',
        visibility: 'public',
        sortOrder: 10,
      },
      {
        id: '3',
        kind: 'streaming',
        providerId: 'spotify',
        url: 'https://open.spotify.com/track/private',
        visibility: 'private',
        sortOrder: 20,
      },
      {
        id: '4',
        kind: 'distribution',
        providerId: 'distrokid',
        url: 'https://distrokid.com/x',
        visibility: 'private',
        sortOrder: 30,
      },
      {
        id: '5',
        kind: 'streaming',
        providerId: 'soundcloud',
        url: 'https://soundcloud.com/x',
        visibility: 'public',
        sortOrder: 40,
      },
    ]);

    assert.equal(links.youtube, 'https://youtube.com/watch?v=1');
    assert.equal(links.spotify, '');
    assert.equal(links.soundcloud, 'https://soundcloud.com/x');
  });

  it('reads migrated flat links via payload helper', () => {
    const links = compileStreamLinksFromPayload({
      links: { youtube: 'https://youtu.be/z', spotify: 'https://open.spotify.com/t' },
    });
    assert.equal(links.youtube, 'https://youtu.be/z');
    assert.equal(links.spotify, 'https://open.spotify.com/t');
  });
});

describe('upsertStreamingLink / helpers', () => {
  it('upserts suno without duplicating', () => {
    let entries = normalizeSongLinks({});
    entries = upsertStreamingLink(entries, 'suno', 'https://suno.com/song/a');
    entries = upsertStreamingLink(entries, 'suno', 'https://suno.com/song/b');
    const suno = entries.filter((e) => e.providerId === 'suno');
    assert.equal(suno.length, 1);
    assert.equal(suno[0].url, 'https://suno.com/song/b');
  });

  it('validates http(s) URLs only', () => {
    assert.equal(isStructurallyValidUrl('https://example.com'), true);
    assert.equal(isStructurallyValidUrl('ftp://example.com'), false);
    assert.equal(isStructurallyValidUrl('not a url'), false);
  });

  it('defaults distribution rows to private', () => {
    const row = createEmptyLinkRow('distribution', { providerId: 'distrokid' });
    assert.equal(row.visibility, 'private');
  });

  it('migrateFlatLinks ignores empty strings', () => {
    assert.equal(migrateFlatLinks({ youtube: '  ', spotify: undefined }).length, 0);
  });
});
