import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultHostContentCatalog } from '../hostContent/catalogDefaults';
import { DEFAULT_VC_GRID_DESIGN } from './gridDesign';
import {
  resolveHostAssignment,
  resolveVcCellContent,
  type VcResolutionContext,
} from './contentResolution';

function baseContext(overrides: Partial<VcResolutionContext> = {}): VcResolutionContext {
  return {
    song: null,
    artistName: 'Test Artist',
    artistBio: 'A short artist biography.',
    artistPhotoUrl: 'https://example.com/artist.jpg',
    playback: { currentTime: 201, duration: 321, isPlaying: true },
    upcoming: [],
    catalog: createDefaultHostContentCatalog(),
    useFallbacks: true,
    gridDesign: DEFAULT_VC_GRID_DESIGN,
    random: () => 0,
    ...overrides,
  };
}

function songPayload() {
  return {
    id: 1,
    title: 'Test Song',
    artist: 'Test Artist',
    year: '2026',
    caption: 'A caption',
    coverUrl: 'https://example.com/cover.jpg',
    videoCoverUrl: 'https://example.com/video-cover.mp4',
    about: 'About this song',
    lyrics: 'Line one\nLine two',
    artistId: 10,
    mainGenre: 'Electronic',
    additionalGenres: 'Ambient, Chill',
    durationSeconds: 321,
  };
}

test('resolveVcCellContent returns empty for blank content', () => {
  const resolved = resolveVcCellContent('', null, baseContext());
  assert.equal(resolved.kind, 'empty');
});

test('resolveVcCellContent returns visualizer kind', () => {
  const resolved = resolveVcCellContent('visualizer', null, baseContext());
  assert.equal(resolved.kind, 'visualizer');
});

test('resolveVcCellContent resolves song cover and title from payload', () => {
  const ctx = baseContext({ song: songPayload() });

  const cover = resolveVcCellContent('cover', null, ctx);
  assert.equal(cover.kind, 'graphic');
  if (cover.kind === 'graphic') {
    assert.equal(cover.remoteUrl, 'https://example.com/cover.jpg');
  }

  const title = resolveVcCellContent('song-title', null, ctx, {});
  assert.equal(title.kind, 'text');
  if (title.kind === 'text') {
    assert.equal(title.text, 'Test Song');
  }
});

test('resolveVcCellContent applies song title overrides (allCaps)', () => {
  const ctx = baseContext({ song: songPayload() });
  const title = resolveVcCellContent('song-title', null, ctx, { allCaps: true });
  assert.equal(title.kind, 'text');
  if (title.kind === 'text') {
    assert.equal(title.text, 'TEST SONG');
    assert.equal(title.allCaps, true);
  }
});

test('resolveVcCellContent uses system fallback when song field missing and useFallbacks true', () => {
  const ctx = baseContext({
    song: { ...songPayload(), coverUrl: null },
    useFallbacks: true,
  });

  const cover = resolveVcCellContent('cover', null, ctx);
  assert.equal(cover.kind, 'graphic');
  if (cover.kind === 'graphic') {
    assert.equal(cover.systemAsset, 'cover');
  }
});

test('resolveVcCellContent returns empty when song field missing and useFallbacks false', () => {
  const ctx = baseContext({
    song: { ...songPayload(), coverUrl: null },
    useFallbacks: false,
  });

  const cover = resolveVcCellContent('cover', null, ctx);
  assert.equal(cover.kind, 'empty');
});

test('resolveHostAssignment resolves host graphic from catalog binding', () => {
  const catalog = createDefaultHostContentCatalog();
  catalog.items.push({
    id: 'logo-1',
    name: 'logo',
    type: 'graphic',
    role: 'logo',
    mediaPath: '/host-content/media/logo.png',
    widthPx: 512,
    heightPx: 512,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const resolved = resolveHostAssignment(
    'host-graphic',
    { itemId: 'logo-1', overrides: { insetPct: 8 } },
    catalog,
  );

  assert.equal(resolved.kind, 'graphic');
  if (resolved.kind === 'graphic') {
    assert.equal(resolved.mediaPath, '/host-content/media/logo.png');
    assert.equal(resolved.presentation?.insetPct, 8);
  }
});

test('resolveHostAssignment rejects type mismatch between slot and catalog item', () => {
  const catalog = createDefaultHostContentCatalog();
  catalog.items.push({
    id: 'title-1',
    name: 'headline',
    type: 'title-text',
    role: 'headline',
    text: 'Hello',
    fontStyle: 'clean',
    fontSize: 'medium',
    color: '#ffffff',
    allCaps: false,
    overflow: 'restart',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const resolved = resolveHostAssignment(
    'host-graphic',
    { itemId: 'title-1', overrides: {} },
    catalog,
  );
  assert.equal(resolved.kind, 'empty');
});

test('resolveVcCellContent resolves host fallback text fields deterministically with random=0', () => {
  const catalog = createDefaultHostContentCatalog();
  const songTitleFallback = catalog.items.find(
    (item) => item.type === 'fallback' && item.slotId === 'song-title',
  );
  assert.ok(songTitleFallback && songTitleFallback.type === 'fallback');
  songTitleFallback.textFields = ['First', 'Second', '', ''];

  const ctx = baseContext({
    catalog,
    song: { ...songPayload(), title: '' },
    random: () => 0,
  });

  const resolved = resolveVcCellContent('song-title', null, ctx);
  assert.equal(resolved.kind, 'text');
  if (resolved.kind === 'text') {
    assert.equal(resolved.text, 'First');
  }
});

test('resolveVcCellContent resolves artist bio and combined bio-name', () => {
  const ctx = baseContext({ song: songPayload(), artistBio: 'Bio paragraph.' });

  const bio = resolveVcCellContent('artist-bio', null, ctx);
  assert.equal(bio.kind, 'text');
  if (bio.kind === 'text') assert.equal(bio.text, 'Bio paragraph.');

  const combined = resolveVcCellContent('artist-bio-name', null, ctx);
  assert.equal(combined.kind, 'artist-bio-name');
  if (combined.kind === 'artist-bio-name') {
    assert.equal(combined.artistName, 'Test Artist');
    assert.equal(combined.bio, 'Bio paragraph.');
  }
});

test('resolveVcCellContent applies lyrics edge fade override', () => {
  const ctx = baseContext({ song: songPayload() });

  const defaultLyrics = resolveVcCellContent('lyrics', null, ctx);
  assert.equal(defaultLyrics.kind, 'lyrics');
  if (defaultLyrics.kind === 'lyrics') {
    assert.equal(defaultLyrics.lyricsEdgeFade, true);
  }

  const noFade = resolveVcCellContent('lyrics', null, ctx, { lyricsEdgeFade: false });
  assert.equal(noFade.kind, 'lyrics');
  if (noFade.kind === 'lyrics') {
    assert.equal(noFade.lyricsEdgeFade, false);
  }
});

test('resolveVcCellContent applies ALARE lyric tracking', () => {
  const ctx = baseContext({
    song: { ...songPayload(), lyrics: '[Verse]\nLine one\nLine two' },
  });

  const alare = resolveVcCellContent('lyrics', null, ctx, { lyricTracking: 'alare' });
  assert.equal(alare.kind, 'lyrics');
  if (alare.kind === 'lyrics') {
    assert.equal(alare.lyricTracking, 'alare');
    assert.equal(alare.markdownSource, false);
    assert.equal(alare.text.includes('['), false);
    assert.equal(alare.alareFadeEnabled, true);
  }
});

test('resolveVcCellContent strips bracketed lyrics when configured', () => {
  const ctx = baseContext({
    song: { ...songPayload(), lyrics: '[Verse 1]\nHello [softly] world\n[Chorus]\nAgain' },
  });

  const raw = resolveVcCellContent('lyrics', null, ctx);
  assert.equal(raw.kind, 'lyrics');
  if (raw.kind === 'lyrics') {
    assert.equal(raw.text, '[Verse 1]\nHello [softly] world\n[Chorus]\nAgain');
  }

  const stripped = resolveVcCellContent('lyrics', null, ctx, { lyricsRemoveBracketed: true });
  assert.equal(stripped.kind, 'lyrics');
  if (stripped.kind === 'lyrics') {
    assert.equal(stripped.text, '\nHello world\n\nAgain');
  }
});

test('resolveVcCellContent resolves song year, length, and elapsed/remaining', () => {
  const ctx = baseContext({
    song: songPayload(),
    playback: { currentTime: 201, duration: 321, isPlaying: false },
  });

  const year = resolveVcCellContent('song-year', null, ctx);
  assert.equal(year.kind, 'text');
  if (year.kind === 'text') assert.equal(year.text, '2026');

  const length = resolveVcCellContent('song-length', null, ctx);
  assert.equal(length.kind, 'text');
  if (length.kind === 'text') assert.equal(length.text, '5:21');

  const elapsed = resolveVcCellContent('elapsed-remaining', null, ctx);
  assert.equal(elapsed.kind, 'text');
  if (elapsed.kind === 'text') assert.equal(elapsed.text, '3:21 / 2:00');
});

test('resolveVcCellContent resolves interactive seek bar and player controls', () => {
  const ctx = baseContext({ song: songPayload() });

  const seek = resolveVcCellContent('seek-bar', null, ctx, {
    seekIncludeTransport: true,
    seekClickable: false,
  });
  assert.equal(seek.kind, 'seek-bar');
  if (seek.kind === 'seek-bar') {
    assert.equal(seek.presentation.includeTransport, true);
    assert.equal(seek.presentation.clickable, false);
  }

  const controls = resolveVcCellContent('player-controls', null, ctx, { controlScalePct: 150 });
  assert.equal(controls.kind, 'player-controls');
  if (controls.kind === 'player-controls') {
    assert.equal(controls.presentation.scalePct, 150);
  }
});

test('resolveVcCellContent applies text alignment override to song title text', () => {
  const ctx = baseContext({ song: songPayload() });
  const resolved = resolveVcCellContent('song-title', null, ctx, { textAlign: 'center' });
  assert.equal(resolved.kind, 'text');
  if (resolved.kind === 'text') {
    assert.equal(resolved.textAlign, 'center');
  }
});

test('resolveVcCellContent resolves upcoming covers when playlist has entries', () => {
  const ctx = baseContext({
    song: songPayload(),
    upcoming: [
      { id: 2, title: 'Next Song', artist: 'Test Artist', coverUrl: 'https://example.com/next.jpg', durationSeconds: 180 },
    ],
  });

  const upcoming = resolveVcCellContent('upcoming-covers', null, ctx, { upcomingLayout: 'multi-row' });
  assert.equal(upcoming.kind, 'upcoming-covers');
  if (upcoming.kind === 'upcoming-covers') {
    assert.equal(upcoming.songs.length, 1);
    assert.equal(upcoming.presentation.layout, 'multi-row');
  }
});