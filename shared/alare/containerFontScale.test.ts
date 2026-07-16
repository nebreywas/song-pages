import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  alareFontSizeBias,
  characteristicLineChars,
  defaultAlareTargetVisibleLines,
  resolveAlareContainerFontPx,
} from './containerFontScale';

describe('alare container font scale', () => {
  test('defaultAlareTargetVisibleLines clamps', () => {
    assert.equal(defaultAlareTargetVisibleLines(undefined), 5);
    assert.equal(defaultAlareTargetVisibleLines(0), 1);
    assert.equal(defaultAlareTargetVisibleLines(99), 15);
  });

  test('font size bias is 1 at medium and compressed at extremes', () => {
    assert.equal(alareFontSizeBias('medium'), 1);
    assert.ok(alareFontSizeBias('tiny') < 1);
    assert.ok(alareFontSizeBias('hero') > 1);
    assert.ok(alareFontSizeBias('hero') < 3);
  });

  test('characteristicLineChars uses upper tail not mean', () => {
    const lines = [
      { text: 'hi' },
      { text: 'yo' },
      { text: 'ok' },
      { text: 'a much longer lyric line here' },
    ];
    const mean = (2 + 2 + 2 + 29) / 4;
    const chars = characteristicLineChars(lines);
    assert.ok(chars > mean);
    assert.ok(chars >= 14);
  });

  test('smaller cells produce smaller type', () => {
    const large = resolveAlareContainerFontPx({
      containerWidth: 800,
      containerHeight: 600,
      fontSize: 'medium',
      targetVisibleLines: 5,
      averageLineChars: 36,
    });
    const small = resolveAlareContainerFontPx({
      containerWidth: 240,
      containerHeight: 160,
      fontSize: 'medium',
      targetVisibleLines: 5,
      averageLineChars: 36,
    });
    assert.ok(small < large);
    assert.ok(small >= 10);
  });

  test('narrow columns with long characteristic lines stay width-bound', () => {
    const narrow = resolveAlareContainerFontPx({
      containerWidth: 220,
      containerHeight: 700,
      fontSize: 'medium',
      targetVisibleLines: 5,
      averageLineChars: 40,
    });
    // Tall height alone would allow huge type; width must win.
    assert.ok(narrow < 24);
  });

  test('more target visible lines shrinks base size when height-bound', () => {
    const few = resolveAlareContainerFontPx({
      containerWidth: 1200,
      containerHeight: 400,
      fontSize: 'medium',
      targetVisibleLines: 3,
      averageLineChars: 12,
    });
    const many = resolveAlareContainerFontPx({
      containerWidth: 1200,
      containerHeight: 400,
      fontSize: 'medium',
      targetVisibleLines: 9,
      averageLineChars: 12,
    });
    assert.ok(many < few);
  });

  test('peakScale leaves headroom when height-bound (smaller base)', () => {
    const plain = resolveAlareContainerFontPx({
      containerWidth: 1200,
      containerHeight: 400,
      fontSize: 'medium',
      averageLineChars: 12,
      peakScale: 1,
    });
    const pretty = resolveAlareContainerFontPx({
      containerWidth: 1200,
      containerHeight: 400,
      fontSize: 'medium',
      averageLineChars: 12,
      peakScale: 1.55,
    });
    assert.ok(pretty < plain);
  });

  test('softBreakLongLines increases size for long lyric lines (width relief)', () => {
    const lines = [
      {
        text: 'Walking through the quiet market stalls, counting every lantern that begins to glow tonight',
      },
      {
        text: 'I keep writing these lines like they somehow make the room bigger than it is when walls close',
      },
      { text: 'Right?' },
      { text: 'Hello world' },
    ];
    const without = resolveAlareContainerFontPx({
      containerWidth: 420,
      containerHeight: 640,
      fontSize: 'medium',
      targetVisibleLines: 5,
      averageLineChars: characteristicLineChars(lines),
      lines,
      softBreakLongLines: false,
      peakScale: 1,
    });
    const withBreaks = resolveAlareContainerFontPx({
      containerWidth: 420,
      containerHeight: 640,
      fontSize: 'medium',
      targetVisibleLines: 5,
      averageLineChars: characteristicLineChars(lines),
      lines,
      softBreakLongLines: true,
      peakScale: 1,
    });
    assert.ok(withBreaks > without, `expected ${withBreaks} > ${without}`);
  });

  test('falls back to Host px before layout', () => {
    assert.equal(
      resolveAlareContainerFontPx({
        containerWidth: 0,
        containerHeight: 0,
        fontSize: 'large',
      }),
      32,
    );
  });
});
