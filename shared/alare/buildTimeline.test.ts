import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAlareTimeline, findActiveAlareLineIndex, resolveAlareScrollLinePosition } from './buildTimeline';
import { resolveTrackDuration } from './resolveTrackDuration';

test('resolveTrackDuration prefers manifest when playback agrees', () => {
  const result = resolveTrackDuration(300, 298);
  assert.equal(result.seconds, 300);
  assert.equal(result.source, 'manifest');
});

test('resolveTrackDuration prefers playback when manifest disagrees materially', () => {
  const result = resolveTrackDuration(300, 240);
  assert.equal(result.seconds, 240);
  assert.equal(result.source, 'playback');
});

test('resolveTrackDuration falls back to playback when manifest missing', () => {
  const result = resolveTrackDuration(null, 180);
  assert.equal(result.seconds, 180);
  assert.equal(result.source, 'playback');
});

test('buildAlareTimeline allocates monotonic non-overlapping intervals', () => {
  const lyrics = '[Verse]\nLine one\nLine two\n\nLine three';
  const timeline = buildAlareTimeline({
    songId: 'song-1',
    lyricsText: lyrics,
    manifestDurationSeconds: 60,
    playbackDurationSeconds: 60,
  });

  assert.ok(timeline);
  assert.equal(timeline!.lines.length, 3);
  for (let i = 0; i < timeline!.lines.length; i++) {
    const line = timeline!.lines[i]!;
    assert.ok(line.startTime >= 0);
    assert.ok(line.endTime <= timeline!.totalDuration);
    assert.ok(line.startTime < line.endTime);
    if (i > 0) {
      assert.ok(line.startTime >= timeline!.lines[i - 1]!.startTime);
    }
  }
});

test('findActiveAlareLineIndex tracks playback position', () => {
  const timeline = buildAlareTimeline({
    songId: 'song-1',
    lyricsText: 'A\n\nB\n\nC',
    manifestDurationSeconds: 90,
    playbackDurationSeconds: 90,
  });
  assert.ok(timeline);
  const { lines } = timeline!;
  assert.equal(findActiveAlareLineIndex(lines, 0), 0);
  assert.equal(findActiveAlareLineIndex(lines, lines[1]!.startTime + 0.01), 1);
  assert.equal(findActiveAlareLineIndex(lines, lines[2]!.endTime + 10), 2);
});

test('resolveAlareScrollLinePosition advances fractionally within a line', () => {
  const timeline = buildAlareTimeline({
    songId: 'song-1',
    lyricsText: 'Alpha\nBeta',
    manifestDurationSeconds: 60,
    playbackDurationSeconds: 60,
  });
  assert.ok(timeline);
  const { lines } = timeline!;
  const mid = (lines[0]!.startTime + lines[0]!.endTime) / 2;
  const pos = resolveAlareScrollLinePosition(lines, mid);
  assert.ok(pos > 0 && pos < 1);
});

test('resolveAlareScrollLinePosition moves through block gaps', () => {
  const timeline = buildAlareTimeline({
    songId: 'song-1',
    lyricsText: 'A\n\nB',
    manifestDurationSeconds: 60,
    playbackDurationSeconds: 60,
  });
  assert.ok(timeline);
  const { lines } = timeline!;
  const gapMid = (lines[0]!.endTime + lines[1]!.startTime) / 2;
  const pos = resolveAlareScrollLinePosition(lines, gapMid);
  assert.equal(pos, 1);
});

test('resolveAlareScrollLinePosition never decreases as time advances', () => {
  const timeline = buildAlareTimeline({
    songId: 'song-1',
    lyricsText: '[V1]\nLine one\nLine two\n\nLine three\nLine four',
    manifestDurationSeconds: 120,
    playbackDurationSeconds: 120,
  });
  assert.ok(timeline);
  const { lines } = timeline!;
  let prev = -1;
  for (let t = 0; t <= timeline!.totalDuration; t += 0.25) {
    const pos = resolveAlareScrollLinePosition(lines, t);
    assert.ok(pos + 0.001 >= prev, `scroll regressed at t=${t}: ${pos} < ${prev}`);
    prev = pos;
  }
});
