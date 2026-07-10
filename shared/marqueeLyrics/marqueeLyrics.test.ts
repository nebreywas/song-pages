import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMarqueeLyricsLayout } from './layout';
import { resolveMarqueeAlareScrollPx } from './scrollAlare';
import { resolveMarqueeSimpleScrollPx } from './scrollSimple';

test('buildMarqueeLyricsLayout flattens sections with wide space gaps', () => {
  const layout = buildMarqueeLyricsLayout('[Verse]\nLine one\nLine two\n\n[Chorus]\nHook line');
  assert.match(layout.text, /Line one Line two {8}Hook line/);
  assert.equal(layout.lineCharStarts.length, 3);
});

test('buildMarqueeLyricsLayout collapses stray newlines in the flat line', () => {
  const layout = buildMarqueeLyricsLayout('Line one\nLine two');
  assert.equal(layout.text.includes('\n'), false);
  assert.equal(layout.text, 'Line one Line two');
});

test('resolveMarqueeSimpleScrollPx scrolls with playback progress', () => {
  assert.equal(resolveMarqueeSimpleScrollPx(0, 400, 200), 0);
  assert.equal(resolveMarqueeSimpleScrollPx(1, 400, 200), -200);
  assert.equal(resolveMarqueeSimpleScrollPx(0.5, 400, 200), -100);
});

test('resolveMarqueeAlareScrollPx advances with line position', () => {
  const layout = buildMarqueeLyricsLayout('Alpha\nBeta\n\nGamma');
  const early = resolveMarqueeAlareScrollPx(0, layout, 300, 100);
  const later = resolveMarqueeAlareScrollPx(2, layout, 300, 100);
  assert.ok(later < early);
});
