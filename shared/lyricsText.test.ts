import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeAlareLyricsText, stripBracketedLyricsText, stripMarkdownLyricsText } from './lyricsText';

test('stripBracketedLyricsText removes inline bracket comments', () => {
  const input = 'Hello [whispered] world';
  assert.equal(stripBracketedLyricsText(input), 'Hello world');
});

test('stripBracketedLyricsText removes annotation-only lines', () => {
  const input = '[Verse 1]\nLine one\n[Chorus]\nLine two';
  assert.equal(stripBracketedLyricsText(input), '\nLine one\n\nLine two');
});

test('stripBracketedLyricsText preserves lines without brackets', () => {
  const input = 'Line one\nLine two';
  assert.equal(stripBracketedLyricsText(input), input);
});

test('stripBracketedLyricsText removes multiple brackets on one line', () => {
  const input = 'Sing [softly] it [loud] now';
  assert.equal(stripBracketedLyricsText(input), 'Sing it now');
});

test('stripBracketedLyricsText collapses triple newlines to double', () => {
  const input = '[Verse 1]\n[Bridge]\n[Chorus]\nLine one';
  assert.equal(stripBracketedLyricsText(input), '\n\nLine one');

  assert.equal(stripBracketedLyricsText('Line one\n\n\nLine two'), 'Line one\n\nLine two');
});

test('stripMarkdownLyricsText removes common markers', () => {
  assert.equal(stripMarkdownLyricsText('**Hello** world'), 'Hello world');
  assert.equal(stripMarkdownLyricsText('# Title\nLine two'), 'Title\nLine two');
  assert.equal(stripMarkdownLyricsText('[click](https://x.test)'), 'click');
});

test('stripMarkdownLyricsText leaves plain lyrics unchanged', () => {
  const input = 'Line one\nLine two';
  assert.equal(stripMarkdownLyricsText(input), input);
});

test('normalizeAlareLyricsText applies bracket then markdown strip', () => {
  assert.equal(normalizeAlareLyricsText('[Verse]\n**Bold** line'), '\nBold line');
});
