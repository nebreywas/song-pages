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
    artistPhotoUrl: 'https://example.com/artist.jpg',
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
    year: 2026,
    caption: 'A caption',
    coverUrl: 'https://example.com/cover.jpg',
    videoCoverUrl: 'https://example.com/video-cover.mp4',
    about: 'About this song',
    lyrics: 'Line one\nLine two',
    artistId: 10,
    mainGenre: 'Electronic',
    additionalGenres: 'Ambient, Chill',
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