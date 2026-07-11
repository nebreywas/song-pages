import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collapseLyricsBlankLines,
  formatListenerLyricsDisplayText,
  normalizeAlareLyricsText,
  stripBracketedLyricsText,
  stripMarkdownLyricsText,
  collapseLyricsHtmlSpacing,
  trimLyricsEdgeBlankLines,
} from './lyricsText';

test('collapseLyricsBlankLines reduces triple newlines to double', () => {
  assert.equal(collapseLyricsBlankLines('Line one\n\n\nLine two'), 'Line one\n\nLine two');
  assert.equal(collapseLyricsBlankLines('Line one\n \n \nLine two'), 'Line one\n\nLine two');
  assert.equal(collapseLyricsBlankLines('Line one\n\n'), 'Line one\n\n');
  assert.equal(collapseLyricsBlankLines('Line one\n\n\n\nLine two'), 'Line one\n\nLine two');
});

test('collapseLyricsHtmlSpacing removes consecutive empty paragraphs', () => {
  assert.equal(
    collapseLyricsHtmlSpacing('<p>A</p><p></p><p></p><p>B</p>'),
    '<p>A</p><p>B</p>',
  );
  assert.equal(collapseLyricsHtmlSpacing('<p>A</p><p></p><p>B</p>'), '<p>A</p><p>B</p>');
  assert.equal(collapseLyricsHtmlSpacing('A<br><br><br>B'), 'A<br><br>B');
});

test('formatListenerLyricsDisplayText collapses blank lines even without bracket strip', () => {
  assert.equal(formatListenerLyricsDisplayText('A\n\n\nB', false), 'A\n\nB');
  assert.equal(formatListenerLyricsDisplayText('[Verse]\n\n\nLine', true), 'Line');
});

test('trimLyricsEdgeBlankLines removes leading and trailing blank lines', () => {
  assert.equal(trimLyricsEdgeBlankLines('\n\nLine one\n\n'), 'Line one');
  assert.equal(trimLyricsEdgeBlankLines('\n\nA\n\nB'), 'A\n\nB');
});

test('stripBracketedLyricsText removes inline bracket comments', () => {
  const input = 'Hello [whispered] world';
  assert.equal(stripBracketedLyricsText(input), 'Hello world');
});

test('stripBracketedLyricsText removes annotation-only lines', () => {
  const input = '[Verse 1]\nLine one\n[Chorus]\nLine two';
  assert.equal(stripBracketedLyricsText(input), 'Line one\n\nLine two');
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
  assert.equal(stripBracketedLyricsText(input), 'Line one');

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
  assert.equal(normalizeAlareLyricsText('[Verse]\n**Bold** line'), 'Bold line');
});
