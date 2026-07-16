import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compileLyricTypography } from './compileLyricTypography';
import { buildPhoneticFamilies } from './phoneticFamilies';
import { parsePrettyLyricsSource } from './parseSource';

describe('prettyLyrics relatedThreshold', () => {
  it('marks cousin lines related without treating them as repeated shape', () => {
    // Pair sits ~0.89 — below a raised near gate so the related band owns it.
    const lyrics = [
      'I walk alone into the quiet midnight city',
      'I walk alone into the silent midnight city',
      '',
      'Something totally different fills this other line today',
    ].join('\n');

    const m = compileLyricTypography(lyrics, {
      enableExactLineRecurrence: true,
      nearDuplicateThreshold: 0.94,
      relatedThreshold: 0.72,
    });

    const related = m.repetitionGroups.filter((g) => g.kind === 'related');
    assert.ok(related.length >= 1, 'expected at least one related group');

    const cousinA = m.blocks.flatMap((b) => b.lines).find((l) => l.rawText.includes('quiet'));
    const cousinB = m.blocks.flatMap((b) => b.lines).find((l) => l.rawText.includes('silent'));
    assert.ok(cousinA && cousinB);
    assert.equal(cousinA!.features.isRelatedLine, true);
    assert.equal(cousinB!.features.isRelatedLine, true);
    assert.equal(cousinA!.features.isRepeatedLine, false);
    assert.equal(cousinB!.features.isRepeatedLine, false);

    const unrelated = m.blocks
      .flatMap((b) => b.lines)
      .find((l) => l.rawText.includes('totally different'));
    assert.ok(unrelated);
    assert.equal(unrelated!.features.isRelatedLine, false);
  });
});

describe('prettyLyrics phonetic families', () => {
  it('groups distinct terminal spellings that share metaphone codes', () => {
    // night / knight share primary Double Metaphone code NT.
    const lyrics = [
      'We meet at night',
      'A shadow of a knight',
      'Unrelated ending paradise',
    ].join('\n');
    const source = parsePrettyLyricsSource(lyrics);
    const families = buildPhoneticFamilies(source);
    assert.ok(families.length >= 1);
    assert.equal(families[0]!.confidence, 'medium');
    assert.ok(families[0]!.tokenIds.length >= 2);
  });

  it('emits phoneticFamilies on the manifest when enabled', () => {
    const lyrics = [
      'We meet at night',
      'A shadow of a knight',
      'A different finish here',
    ].join('\n');
    const off = compileLyricTypography(lyrics, { enablePhoneticTails: false });
    assert.equal(off.phoneticFamilies.length, 0);

    const on = compileLyricTypography(lyrics, { enablePhoneticTails: true });
    assert.ok(on.phoneticFamilies.length >= 1);
    const phoneticReasons = on.blocks
      .flatMap((b) => b.lines)
      .flatMap((l) => l.tokens)
      .filter((t) => t.reasons.some((r) => r.rule === 'phonetic-tail'));
    assert.ok(phoneticReasons.length >= 2);
  });

  it('skips families that only come from exact line repetition', () => {
    const lyrics = ['Same ending word paradise', 'Same ending word paradise'].join('\n');
    const source = parsePrettyLyricsSource(lyrics);
    const families = buildPhoneticFamilies(source);
    assert.equal(families.length, 0);
  });
});

describe('prettyLyrics track-level repetition', () => {
  it('boosts content words that recur across the song', () => {
    const lyrics = [
      'Heartbeat in the valley',
      'Heartbeat on the mountain',
      'Heartbeat through the river',
      'Quiet different closer',
    ].join('\n');
    const m = compileLyricTypography(lyrics);
    const heartbeats = m.blocks
      .flatMap((b) => b.lines)
      .flatMap((l) => l.tokens)
      .filter((t) => t.normalizedText === 'heartbeat');
    assert.ok(heartbeats.length >= 3);
    assert.ok(
      heartbeats.every((t) => t.reasons.some((r) => r.rule === 'track-repetition')),
      'chorus keyword should carry track-repetition reasons',
    );
    assert.ok(heartbeats.every((t) => t.evidence.localRepetition >= 0.3));
  });
});
