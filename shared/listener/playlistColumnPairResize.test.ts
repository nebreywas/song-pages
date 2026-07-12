import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyPairResizeToSizing,
  clampPlaylistColumnPair,
  resolvePreviewColumnWidths,
} from './playlistColumnPairResize.ts';
import {
  MIN_PLAYLIST_COLUMN_PX,
  normalizePlaylistColumnRatios,
  playlistColumnOrder,
  ratiosToColumnWidths,
} from './playlistColumnLayout.ts';

test('clampPlaylistColumnPair enforces minimum width on both columns', () => {
  const [year, duration] = clampPlaylistColumnPair(200, 20, 'year', 'duration');
  assert.equal(duration, MIN_PLAYLIST_COLUMN_PX.duration);
  assert.ok(year < 200);
});

test('applyPairResizeToSizing trades width with the right neighbor', () => {
  const profile = 'virtual';
  const base = ratiosToColumnWidths(960, normalizePlaylistColumnRatios({}, profile), profile);
  const sizing = Object.fromEntries(playlistColumnOrder(profile).map((id) => [id, base[id]]));

  const next = applyPairResizeToSizing(sizing, 'year', 10, profile);

  assert.equal(next.year, sizing.year! + 10);
  assert.equal(next.duration, sizing.duration! - 10);

  const sumBefore = playlistColumnOrder(profile).reduce((total, id) => total + sizing[id]!, 0);
  const sumAfter = playlistColumnOrder(profile).reduce((total, id) => total + next[id]!, 0);
  assert.equal(sumBefore, sumAfter);
});

test('applyPairResizeToSizing uses the active column even when TanStack scales all columns', () => {
  const profile = 'virtual';
  const base = ratiosToColumnWidths(960, normalizePlaylistColumnRatios({}, profile), profile);
  const sizing = Object.fromEntries(playlistColumnOrder(profile).map((id) => [id, base[id]]));

  const next = applyPairResizeToSizing(sizing, 'album', 10, profile);

  assert.equal(next.album, sizing.album! + 10);
  assert.equal(next.year, sizing.year! - 10);
  assert.equal(next.order, sizing.order);
  assert.equal(next.title, sizing.title);
});

test('resolvePreviewColumnWidths clamps year/duration during drag preview', () => {
  const profile = 'catalog';
  const base = ratiosToColumnWidths(800, normalizePlaylistColumnRatios({}, profile), profile);
  const sizing = Object.fromEntries(playlistColumnOrder(profile).map((id) => [id, base[id]]));

  const preview = resolvePreviewColumnWidths(
    sizing,
    profile,
    'year',
    sizing.year,
    120,
  );

  assert.equal(preview.duration, MIN_PLAYLIST_COLUMN_PX.duration);
  assert.ok(preview.year! > sizing.year!);
});
