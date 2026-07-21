/**
 * Unit tests for Radio Mode timing / announcement helpers.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRadioAnnouncementText,
  buildRadioBreakSegments,
  formatSpokenClock,
  formatSpokenDate,
  pickRadioAnnouncementKind,
  RADIO_POST_SILENCE_SECONDS,
  RADIO_PRE_SILENCE_SECONDS,
  shouldStartRadioBreak,
} from './radioMode';
import { normalizeRadioVoiceId, resolveRadioVoiceProfile } from './radioVoices';

test('shouldStartRadioBreak respects probability', () => {
  assert.equal(shouldStartRadioBreak(() => 0.49, 0.5), true);
  assert.equal(shouldStartRadioBreak(() => 0.5, 0.5), false);
  assert.equal(shouldStartRadioBreak(() => 0.99, 0.5), false);
});

test('pickRadioAnnouncementKind covers the catalog', () => {
  assert.equal(pickRadioAnnouncementKind(() => 0), 'time');
  assert.equal(pickRadioAnnouncementKind(() => 0.99), 'date');
});

test('formatSpokenClock uses oh for single-digit minutes', () => {
  // Fixed instant: 2026-07-19 15:05 America/New_York (EDT).
  const date = new Date('2026-07-19T19:05:00.000Z');
  const spoken = formatSpokenClock(date, 'America/New_York');
  assert.match(spoken, /oh 5/i);
  assert.doesNotMatch(spoken, /zero/i);
});

test('formatSpokenDate omits the year', () => {
  const date = new Date('2026-07-19T16:00:00.000Z');
  const spoken = formatSpokenDate(date, 'America/New_York');
  assert.match(spoken, /July/);
  assert.match(spoken, /19/);
  assert.doesNotMatch(spoken, /2026/);
});

test('buildRadioBreakSegments splices announcement directly into zen silence', () => {
  const segments = buildRadioBreakSegments({
    announcementText: 'The time is 3 oh 5 P M.',
    announcementKind: 'time',
    zenSilenceSeconds: 10,
  });
  assert.equal(segments[0]?.kind, 'silence');
  assert.equal(segments[0] && segments[0].kind === 'silence' ? segments[0].durationSeconds : 0, 5);
  assert.equal(segments[1]?.kind, 'speak');
  assert.equal(segments[1]?.title, 'Radio Break');
  assert.equal(segments[2]?.kind, 'silence');
  assert.equal(segments[2] && segments[2].kind === 'silence' ? segments[2].durationSeconds : 0, 5);
  assert.equal(segments.length, 3);
});

test('buildRadioBreakSegments uses 2.5 seconds on each side without zen', () => {
  const segments = buildRadioBreakSegments({
    announcementText: 'Today is July 19.',
    announcementKind: 'date',
  });
  assert.equal(segments.length, 3);
  assert.equal(segments[0]?.title, 'Radio Break');
  assert.equal(
    segments[0] && segments[0].kind === 'silence' ? segments[0].durationSeconds : 0,
    RADIO_PRE_SILENCE_SECONDS,
  );
  assert.equal(segments[1]?.kind, 'speak');
  assert.equal(segments[1]?.title, 'Radio Break');
  assert.equal(segments[2]?.title, 'Radio Break');
  assert.equal(
    segments[2] && segments[2].kind === 'silence' ? segments[2].durationSeconds : 0,
    RADIO_POST_SILENCE_SECONDS,
  );
  assert.equal(RADIO_PRE_SILENCE_SECONDS, 2.5);
  assert.equal(RADIO_POST_SILENCE_SECONDS, 2.5);
});

test('buildRadioAnnouncementText falls back when weather is missing', () => {
  const text = buildRadioAnnouncementText('temperature', null);
  assert.match(text, /unavailable/i);
});

test('normalizeRadioVoiceId defaults to allison', () => {
  assert.equal(normalizeRadioVoiceId('nope'), 'allison');
  assert.equal(normalizeRadioVoiceId('nathan'), 'nathan');
  assert.equal(normalizeRadioVoiceId('random'), 'random');
});

test('resolveRadioVoiceProfile random stays in catalog', () => {
  const profile = resolveRadioVoiceProfile('random', () => 0);
  assert.equal(profile.id, 'allison');
});
