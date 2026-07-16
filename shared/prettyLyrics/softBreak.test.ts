import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { compileLyricTypography } from './compileLyricTypography';
import {
  planPlainLineSoftBreak,
  planPrettyLineSoftBreak,
  softBrokenMaxRowChars,
} from './softBreak';
import { SAMPLE_PRETTY_LYRICS_DENSE } from './sampleLyrics';

describe('pretty lyrics soft break', () => {
  test('short lines do not soft-break', () => {
    const manifest = compileLyricTypography('Hello world\nShort line', {
      enableDensity: true,
    });
    const line = manifest.blocks[0]?.lines[0];
    assert.ok(line);
    assert.equal(planPrettyLineSoftBreak(line!), null);
  });

  test('already-small sentences stay intact even when dense', () => {
    const samples = [
      'Everybody keeps saying that',
      'I scream out to the world,',
      'Something in the water seems',
      'Right?',
      'Yes it seems',
    ];
    for (const text of samples) {
      const manifest = compileLyricTypography(text, { enableDensity: true });
      const line = manifest.blocks[0]?.lines[0];
      assert.ok(line, text);
      assert.equal(planPrettyLineSoftBreak(line!), null, `should not break: ${text}`);
      assert.equal(planPlainLineSoftBreak(text), null, `plain should not break: ${text}`);
    }
  });

  test('long clause prefers punctuation near midpoint', () => {
    const text =
      'Walking through the quiet market stalls, counting every lantern that begins to glow';
    const manifest = compileLyricTypography(text, { enableDensity: true });
    const line = manifest.blocks[0]?.lines[0];
    assert.ok(line);
    const plan = planPrettyLineSoftBreak(line!);
    assert.ok(plan);
    assert.equal(plan!.reason, 'punctuation');
    const row1 = line!.tokens.slice(0, plan!.breakAtTokenIndex).map((t) => t.rawText).join('');
    const row2 = line!.tokens.slice(plan!.breakAtTokenIndex).map((t) => t.rawText).join('');
    assert.match(row1, /,/);
    assert.ok(row2.trim().length > 0);
    assert.ok(!row2.startsWith(','));
  });

  test('long dense text without commas breaks on a mid word', () => {
    const text =
      'endless rolling syllables cascading over another another wave of wandering melody tonight forever';
    const manifest = compileLyricTypography(text, { enableDensity: true });
    const line = manifest.blocks[0]?.lines[0];
    assert.ok(line);
    const plan = planPrettyLineSoftBreak(line!);
    assert.ok(plan);
    assert.equal(plan!.reason, 'word');
    assert.ok(plan!.breakAtTokenIndex > 0);
    assert.ok(plan!.breakAtTokenIndex < line!.tokens.length);
  });

  test('dense sample lyrics produce at least one soft-break candidate', () => {
    const manifest = compileLyricTypography(SAMPLE_PRETTY_LYRICS_DENSE, {
      enableDensity: true,
    });
    const plans = manifest.blocks.flatMap((b) =>
      b.lines.map((line) => planPrettyLineSoftBreak(line)),
    );
    assert.ok(plans.some((p) => p != null));
  });

  test('plain soft break finds comma then falls back to word', () => {
    const punct = planPlainLineSoftBreak(
      'alpha beta gamma delta, epsilon zeta eta theta iota',
    );
    assert.ok(punct);
    assert.equal(punct!.reason, 'punctuation');

    const word = planPlainLineSoftBreak(
      'alpha beta gamma delta epsilon zeta eta theta iota kappa',
    );
    assert.ok(word);
    assert.equal(word!.reason, 'word');
  });

  test('softBrokenMaxRowChars is shorter than the full line when broken', () => {
    const text =
      'Walking through the quiet market stalls, counting every lantern that begins to glow';
    const full = text.length;
    const row = softBrokenMaxRowChars(text);
    assert.ok(row < full);
    assert.ok(row > 10);
  });
});
