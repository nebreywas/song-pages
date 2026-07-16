import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultHostContentCatalog } from '../hostContent/catalogDefaults.ts';
import { DEFAULT_VC_GRID_DESIGN } from './gridDesign.ts';
import {
  formatDualSlotSuppressedMessage,
  selectRenderableCellContents,
} from './dualSlotAvailability.ts';
import type { VcResolutionContext } from './contentResolution.ts';
import type { VcCellAssignment } from '../vcModeTypes.ts';

function emptyCell(overrides: Partial<VcCellAssignment> = {}): VcCellAssignment {
  return {
    slotA: '',
    slotB: '',
    hostSlotA: null,
    hostSlotB: null,
    songSlotA: null,
    songSlotB: null,
    cycleTime: null,
    transitionStyle: 'replace',
    ...overrides,
  };
}

function baseContext(overrides: Partial<VcResolutionContext> = {}): VcResolutionContext {
  return {
    song: {
      id: 1,
      title: 'Test Song',
      artist: 'Test Artist',
      year: '2026',
      caption: null,
      coverUrl: 'https://example.com/cover.jpg',
      videoCoverUrl: null,
      about: '',
      lyrics: '',
      artistId: 10,
    },
    artistName: 'Test Artist',
    artistBio: null,
    artistPhotoUrl: null,
    playback: { currentTime: 0, duration: 100, isPlaying: true },
    upcoming: [],
    catalog: createDefaultHostContentCatalog(),
    useFallbacks: false,
    gridDesign: DEFAULT_VC_GRID_DESIGN,
    ...overrides,
  };
}

test('dual: both source-present keeps switching', () => {
  const cell = emptyCell({
    slotA: 'cover',
    slotB: 'song-title',
    cycleTime: 10,
  });
  const result = selectRenderableCellContents(cell, baseContext());
  assert.deepEqual(result.contents, ['cover', 'song-title']);
  assert.equal(result.switchingSuppressed, false);
});

test('dual 1-of-2: missing partner is withheld (no system fallback partner)', () => {
  const cell = emptyCell({
    slotA: 'cover',
    slotB: 'video-cover',
    cycleTime: 10,
  });
  const result = selectRenderableCellContents(cell, baseContext({ useFallbacks: true }));
  assert.deepEqual(result.contents, ['cover']);
  assert.deepEqual(result.missing, ['video-cover']);
  assert.equal(result.switchingSuppressed, true);
});

test('dual 1-of-2: primary missing still shows secondary source', () => {
  const cell = emptyCell({
    slotA: 'video-cover',
    slotB: 'cover',
    cycleTime: 'click',
  });
  const result = selectRenderableCellContents(cell, baseContext({ useFallbacks: true }));
  assert.deepEqual(result.contents, ['cover']);
  assert.deepEqual(result.missing, ['video-cover']);
  assert.equal(result.switchingSuppressed, true);
});

test('single 1-of-1: missing source stays mounted so fallbacks can fill', () => {
  const cell = emptyCell({
    slotA: 'video-cover',
    slotB: '',
    cycleTime: null,
  });
  const result = selectRenderableCellContents(cell, baseContext({ useFallbacks: true }));
  assert.deepEqual(result.contents, ['video-cover']);
  assert.equal(result.switchingSuppressed, false);
});

test('dual 2-of-2: system fallbacks fill when assets are available', () => {
  const cell = emptyCell({
    slotA: 'video-cover',
    slotB: 'lyrics-video',
    cycleTime: 15,
  });
  const result = selectRenderableCellContents(
    cell,
    baseContext({
      useFallbacks: true,
      song: {
        id: 1,
        title: 'Test Song',
        artist: 'Test Artist',
        year: null,
        caption: null,
        coverUrl: null,
        videoCoverUrl: null,
        lyricsVideoUrl: null,
        about: '',
        lyrics: '',
        artistId: 10,
      },
      // Omit isSystemFallbackAssetAvailable → system media defaults resolve.
    }),
  );
  assert.deepEqual(result.contents, ['video-cover', 'lyrics-video']);
  assert.equal(result.switchingSuppressed, false);
});

test('dual 2-of-2: unavailable system assets fail closed', () => {
  const cell = emptyCell({
    slotA: 'video-cover',
    slotB: 'lyrics-video',
    cycleTime: 15,
  });
  const result = selectRenderableCellContents(
    cell,
    baseContext({
      useFallbacks: true,
      song: {
        id: 1,
        title: 'Test Song',
        artist: 'Test Artist',
        year: null,
        caption: null,
        coverUrl: null,
        videoCoverUrl: null,
        lyricsVideoUrl: null,
        about: '',
        lyrics: '',
        artistId: 10,
      },
      isSystemFallbackAssetAvailable: () => false,
    }),
  );
  assert.deepEqual(result.contents, []);
  assert.deepEqual(result.missing, ['video-cover', 'lyrics-video']);
  assert.equal(result.switchingSuppressed, false);
});

test('formatDualSlotSuppressedMessage names present and missing content', () => {
  const msg = formatDualSlotSuppressedMessage('Area 2', {
    configured: ['cover', 'video-cover'],
    contents: ['cover'],
    missing: ['video-cover'],
    switchingSuppressed: true,
  });
  assert.match(msg, /Area 2/);
  assert.match(msg, /Cover/);
  assert.match(msg, /Video Cover/);
  assert.match(msg, /switching disabled/);
});
