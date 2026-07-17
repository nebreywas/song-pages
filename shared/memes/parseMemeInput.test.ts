import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMemeInput } from './parseMemeInput.ts';
import { sanitizeMemeSettings } from './sanitizeMemeSettings.ts';
import { applyMemeTimer, sanitizeMemeTimer } from './memeTimer.ts';
import { DEFAULT_MEME_SETTINGS } from './types.ts';

test('parseMemeInput rejects empty and invalid input', () => {
  assert.equal(parseMemeInput('').ok, false);
  assert.equal(parseMemeInput('   ').ok, false);
  assert.equal(parseMemeInput('not a url').ok, false);
  assert.equal(parseMemeInput('ftp://example.com/x.gif').ok, false);
});

test('parseMemeInput rejects non-media links (pages, etc.)', () => {
  assert.equal(parseMemeInput('https://example.com/some/landing-page').ok, false);
  assert.equal(parseMemeInput('https://example.com/watch?v=abc').ok, false);
  assert.equal(parseMemeInput('https://example.com/file.txt').ok, false);
});

test('parseMemeInput accepts direct image files as image media', () => {
  for (const ext of ['gif', 'png', 'apng', 'webp']) {
    const res = parseMemeInput(`https://example.com/path/clip.${ext}`);
    assert.ok(res.ok, `expected ${ext} to be accepted`);
    assert.equal(res.media.mediaType, 'gif');
  }

  // Extension match is case-insensitive and ignores the query string.
  const upper = parseMemeInput('https://example.com/path/loop.WEBP?token=1');
  assert.ok(upper.ok);
  assert.equal(upper.media.mediaType, 'gif');
});

test('parseMemeInput accepts direct video files as video media', () => {
  for (const ext of ['mp4', 'webm', 'm4v']) {
    const res = parseMemeInput(`https://example.com/x.${ext}`);
    assert.ok(res.ok, `expected ${ext} to be accepted`);
    assert.equal(res.media.mediaType, 'video');
  }
});

test('parseMemeInput preserves the exact URL', () => {
  const url = 'https://cdn.example.com/a/b/side-eye.mp4?x=1';
  const res = parseMemeInput(url);
  assert.ok(res.ok);
  assert.equal(res.media.url, url);
});

test('sanitizeMemeSettings clamps and coerces', () => {
  assert.deepEqual(sanitizeMemeSettings(undefined), DEFAULT_MEME_SETTINGS);
  const s = sanitizeMemeSettings({
    clickClears: false,
    playIndefinitely: true,
    durationSeconds: 100000,
    minRoundtrips: -5,
    clearAfterCycle: false,
  });
  assert.equal(s.clickClears, false);
  assert.equal(s.playIndefinitely, true);
  assert.equal(s.durationSeconds, 600); // clamped to max
  assert.equal(s.minRoundtrips, 0); // clamped to min
  assert.equal(s.clearAfterCycle, false);
});

test('sanitizeMemeTimer coerces values', () => {
  assert.equal(sanitizeMemeTimer('hold'), 'hold');
  assert.equal(sanitizeMemeTimer(15), 15);
  assert.equal(sanitizeMemeTimer('30'), 30);
  assert.equal(sanitizeMemeTimer(0), undefined);
  assert.equal(sanitizeMemeTimer(-5), undefined);
  assert.equal(sanitizeMemeTimer('nope'), undefined);
  assert.equal(sanitizeMemeTimer(undefined), undefined);
  assert.equal(sanitizeMemeTimer(10_000), 600); // clamped to max
});

test('applyMemeTimer overrides global duration / indefinite behavior', () => {
  const base = { ...DEFAULT_MEME_SETTINGS, durationSeconds: 12, playIndefinitely: false };

  // undefined → unchanged
  assert.deepEqual(applyMemeTimer(base, undefined), base);

  // 'hold' → play indefinitely
  assert.equal(applyMemeTimer(base, 'hold').playIndefinitely, true);

  // number → fixed duration, not indefinite
  const timed = applyMemeTimer({ ...base, playIndefinitely: true }, 25);
  assert.equal(timed.playIndefinitely, false);
  assert.equal(timed.durationSeconds, 25);
});
