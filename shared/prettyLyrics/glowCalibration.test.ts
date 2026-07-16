import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compileLyricTypography } from './compileLyricTypography';

const CALIBRATION_LYRICS = `Maybe love,
Or just a dream?
Something more,
Or in between?

Need...
What love will need me?
Fool...
What love could fool me?
Bind...
What love should bind me?
Which love will find me tonight?

Need...
What love will need me?
Fool...
What love could fool me?
Bind...
What love should bind me?
Which love will find me tonight?

Maybe it was...
All a dream`;

describe('pretty lyrics glow calibration', () => {
  it('glows sparse title anchors without washing dense motif lines', () => {
    const manifest = compileLyricTypography(CALIBRATION_LYRICS, {
      enableGlow: true,
      enableRepeatedPhrases: true,
      enableRepeatedOpeningsEndings: true,
      enableExactLineRecurrence: true,
    });

    const lines = manifest.blocks.flatMap((b) => b.lines);
    const glowOn = (raw: string) => {
      const line = lines.find((l) => l.rawText.trim() === raw);
      assert.ok(line, `missing line ${raw}`);
      return line!.tokens.filter((t) => t.isWord && t.typography.glow).map((t) => t.normalizedText);
    };

    assert.deepEqual(glowOn('Need...'), ['need']);
    assert.deepEqual(glowOn('Fool...'), ['fool']);
    assert.deepEqual(glowOn('Bind...'), ['bind']);

    const dense = glowOn('What love will need me?');
    assert.ok(dense.length <= 1, `dense line should stay sparse-glow, got ${dense.join(',')}`);
  });
});
