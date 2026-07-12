import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  activeWidthsToRatios,
  columnWidthsToSizingState,
  fitColumnWidthsToPanel,
  MIN_PLAYLIST_COLUMN_PX,
  normalizePlaylistColumnLayoutSettings,
  normalizePlaylistColumnRatios,
  playlistColumnOrder,
  playlistDataAreaWidth,
  playlistGridTemplateColumns,
  playlistGridSlots,
  playlistLayoutProfile,
  ratiosToColumnWidths,
  scaleColumnWidthsToPanel,
  syncColumnWidthsToPanel,
} from './playlistColumnLayout.ts';

test('playlistLayoutProfile picks source layout only when panel is wide enough', () => {
  assert.equal(playlistLayoutProfile(true, true, 800), 'virtualWithSource');
  assert.equal(playlistLayoutProfile(true, true, 400), 'virtual');
  assert.equal(playlistLayoutProfile(false, false, 800), 'catalog');
});

test('ratiosToColumnWidths fills the full table width', () => {
  const widths = ratiosToColumnWidths(960, normalizePlaylistColumnRatios({}, 'virtual'), 'virtual');
  const sum = playlistColumnOrder('virtual').reduce((total, id) => total + widths[id], 0);
  assert.equal(sum, 960);
});

test('playlistGridSlots alternates columns with resize gutters', () => {
  const order = playlistColumnOrder('virtual');
  const slots = playlistGridSlots(order);
  assert.equal(slots.length, order.length * 2 - 1);
  assert.equal(slots[0]?.kind, 'column');
  assert.equal(slots[0]?.id, 'order');
  assert.deepEqual(slots[1], { kind: 'gutter', left: 'order', right: 'custom' });
});

test('fitColumnWidthsToPanel keeps fixed columns inside the panel', () => {
  const profile = 'virtual';
  const order = playlistColumnOrder(profile);
  const wide = ratiosToColumnWidths(900, normalizePlaylistColumnRatios({}, profile), profile);
  const fitted = fitColumnWidthsToPanel(wide, 420, profile);
  const fixedSum = order
    .filter((id) => id !== 'title')
    .reduce((total, id) => total + fitted[id]!, 0);
  const dataArea = playlistDataAreaWidth(420, order.length);
  assert.ok(fixedSum <= dataArea);
  assert.ok(fitted.duration! >= MIN_PLAYLIST_COLUMN_PX.duration);
});

test('scaleColumnWidthsToPanel keeps columns inside the panel', () => {
  const profile = 'virtual';
  const base = ratiosToColumnWidths(900, normalizePlaylistColumnRatios({}, profile), profile);
  const scaled = scaleColumnWidthsToPanel(base, 1000, profile);
  const order = playlistColumnOrder(profile);
  const fixedSum = order
    .filter((id) => id !== 'title')
    .reduce((total, id) => total + scaled[id]!, 0);
  assert.ok(fixedSum <= playlistDataAreaWidth(1000, order.length));
});

test('columnWidthsToSizingState maps active profile columns', () => {
  const widths = ratiosToColumnWidths(960, normalizePlaylistColumnRatios({}, 'virtual'), 'virtual');
  const sizing = columnWidthsToSizingState(widths, 'virtual');
  assert.equal(sizing.title, widths.title);
  assert.equal(Object.keys(sizing).length, playlistColumnOrder('virtual').length);
});

test('playlistGridTemplateColumns alternates data columns with resize gutters', () => {
  const order = playlistColumnOrder('virtual');
  const widths = ratiosToColumnWidths(960, normalizePlaylistColumnRatios({}, 'virtual'), 'virtual');
  const template = playlistGridTemplateColumns(order, widths);
  assert.match(template, /minmax\(72px, 1fr\)/);
  assert.match(template, /px 6px/);
  assert.match(template, /minmax\(52px, \d+px\)$/);
});

test('playlistDataAreaWidth subtracts gutter space from panel width', () => {
  const order = playlistColumnOrder('virtualWithSource');
  assert.equal(playlistDataAreaWidth(800, order.length), 800 - (order.length - 1) * 6);
});

test('activeWidthsToRatios preserves resize proportions', () => {
  const ratios = activeWidthsToRatios(
    {
      order: 60,
      custom: 40,
      title: 500,
      artist: 120,
      album: 120,
      year: 50,
      source: 0,
      duration: 70,
    },
    'virtual',
  );
  assert.ok(ratios.title > ratios.artist);
  assert.ok(ratios.artist > 0);
});

test('normalizePlaylistColumnLayoutSettings migrates legacy flex-only saves', () => {
  const settings = normalizePlaylistColumnLayoutSettings({
    withArtist: { title: 0.7, artist: 0.15, album: 0.15 },
    noArtist: { title: 0.75, album: 0.25 },
  });
  assert.ok(settings.virtual);
  assert.ok(settings.catalog);
  assert.equal(settings.virtualWithSource, null);
});
