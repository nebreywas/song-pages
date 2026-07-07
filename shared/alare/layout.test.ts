import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAlareTimeline } from './buildTimeline';
import { alareScrollOffsetPx } from './layout';
import { parseAlareLyrics } from './parseLyrics';
import type { AlareLyricLine } from './types';

test('parseAlareLyrics preserves blank-line-separated blocks', () => {
  const parsed = parseAlareLyrics('[Verse]\nLine one\nLine two\n\n[Chorus]\nHook line');
  assert.equal(parsed.blocks.length, 2);
  assert.equal(parsed.blocks[0]!.lines.length, 2);
  assert.equal(parsed.blocks[1]!.lines.length, 1);
  assert.equal(parsed.blocks[1]!.lines[0]!.lineIndexInBlock, 0);
});

test('alareScrollOffsetPx includes block gap height between sections', () => {
  const timeline = buildAlareTimeline({
    songId: 'song-1',
    lyricsText: 'A\n\nB',
    manifestDurationSeconds: 60,
    playbackDurationSeconds: 60,
  });
  assert.ok(timeline);
  const { lines } = timeline!;
  const lineH = 32;
  const gapH = 16;
  const atSecondBlock = alareScrollOffsetPx(1, lines, lineH, gapH);
  const withoutGap = 1 * lineH;
  assert.equal(atSecondBlock, withoutGap + gapH);
});

test('alareScrollOffsetPx spreads block gap across the line transition', () => {
  const lines = [
    { id: '0', lineIndexInBlock: 0 },
    { id: '1', lineIndexInBlock: 0 },
  ] as AlareLyricLine[];
  const lineH = 40;
  const gapH = 22;
  const before = alareScrollOffsetPx(0.5, lines, lineH, gapH);
  const after = alareScrollOffsetPx(1, lines, lineH, gapH);
  assert.equal(before, 0.5 * (lineH + gapH));
  assert.ok(after - before < lineH + gapH);
  assert.equal(alareScrollOffsetPx(0.99, lines, lineH, gapH), 0.99 * (lineH + gapH));
});
