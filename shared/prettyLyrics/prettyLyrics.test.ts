import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compileLyricTypography } from './compileLyricTypography';
import {
  buildPrettyLyricsExport,
  parsePrettyLyricsExportJson,
  prettyLyricsExportToJson,
} from './exportConfig';
import { isBracketMetadataLine, normalizeForAnalysis } from './normalize';
import { parsePrettyLyricsSource } from './parseSource';
import { SAMPLE_PRETTY_LYRICS } from './sampleLyrics';
import { diceCoefficient, levenshteinDistance } from './similarity';
import { DEFAULT_PRETTY_LYRICS_OPTIONS } from './types';

describe('prettyLyrics normalize', () => {
  it('detects bracket-only metadata lines', () => {
    assert.equal(isBracketMetadataLine('[Chorus]'), true);
    assert.equal(isBracketMetadataLine('  [Verse 1]  '), true);
    assert.equal(isBracketMetadataLine('Hello [softly] world'), false);
  });

  it('normalizes analysis text without rewriting apostrophes', () => {
    assert.equal(normalizeForAnalysis("Just tryin' to help"), "just tryin' to help");
  });
});

describe('prettyLyrics parse', () => {
  it('excludes bracket metadata and preserves blocks', () => {
    const parsed = parsePrettyLyricsSource(SAMPLE_PRETTY_LYRICS);
    assert.ok(parsed.excludedMetadataLines >= 3);
    assert.ok(parsed.blocks.length >= 3);
    assert.ok(parsed.allLines.every((l) => !isBracketMetadataLine(l.rawText)));
  });
});

describe('prettyLyrics similarity', () => {
  it('scores identical token sets high', () => {
    assert.equal(diceCoefficient(['a', 'b'], ['a', 'b']), 1);
    assert.equal(levenshteinDistance('paradise', 'paradise'), 0);
  });
});

describe('prettyLyrics compile', () => {
  it('is deterministic for the same input and options', () => {
    const a = compileLyricTypography(SAMPLE_PRETTY_LYRICS, { presetId: 'editorial-neon' });
    const b = compileLyricTypography(SAMPLE_PRETTY_LYRICS, { presetId: 'editorial-neon' });
    assert.equal(a.sourceHash, b.sourceHash);
    assert.equal(a.trackSeed, b.trackSeed);
    assert.equal(JSON.stringify(a.blocks), JSON.stringify(b.blocks));
  });

  it('detects repeated phrases and lines', () => {
    const m = compileLyricTypography(SAMPLE_PRETTY_LYRICS);
    assert.ok(m.phraseMotifs.some((p) => p.phrase.includes('paradise')));
    assert.ok(m.repetitionGroups.some((g) => g.kind === 'line' && g.count >= 2));
  });

  it('attaches reasons to non-standard tokens', () => {
    const m = compileLyricTypography(SAMPLE_PRETTY_LYRICS);
    const styled = m.blocks
      .flatMap((b) => b.lines)
      .flatMap((l) => l.tokens)
      .filter((t) => t.isWord && t.typography.role !== 'quiet' && t.typography.role !== 'standard');
    assert.ok(styled.length > 0);
    assert.ok(styled.every((t) => t.reasons.length > 0 || t.typography.role === 'motif'));
  });

  it('produces distinct presets from the same analysis path', () => {
    const neon = compileLyricTypography(SAMPLE_PRETTY_LYRICS, { presetId: 'editorial-neon' });
    const poster = compileLyricTypography(SAMPLE_PRETTY_LYRICS, { presetId: 'poster' });
    assert.equal(neon.phraseMotifs.length, poster.phraseMotifs.length);
    assert.notEqual(neon.presetId, poster.presetId);
  });

  it('resolves compatible curated themes and generated harmony palettes', () => {
    const coastal = compileLyricTypography(SAMPLE_PRETTY_LYRICS, { themeId: 'coastal-dusk' });
    const harmony = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      themeId: 'harmony',
      harmonyHue: 200,
      harmonyMode: 'analogous',
      harmonySurface: 'dark',
    });
    assert.equal(coastal.themeId, 'coastal-dusk');
    assert.equal(coastal.palette.background, '#0b1219');
    assert.equal(harmony.themeId, 'harmony');
    assert.ok(harmony.palette.motifs.length >= 3);
    assert.notEqual(harmony.palette.motifs[0], coastal.palette.motifs[0]);
  });

  it('maps measurements into size variance and optional center drift', () => {
    const flat = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      sizeVariance: 0,
      centerDriftPct: 0,
      presetId: 'editorial-neon',
    });
    const loud = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      sizeVariance: 1.8,
      centerDriftPct: 12,
      presetId: 'editorial-neon',
    });

    const flatScales = flat.blocks.flatMap((b) => b.lines).flatMap((l) =>
      l.tokens.filter((t) => t.isWord).map((t) => t.typography.scale),
    );
    const loudScales = loud.blocks.flatMap((b) => b.lines).flatMap((l) =>
      l.tokens.filter((t) => t.isWord).map((t) => t.typography.scale),
    );
    const flatSpread = Math.max(...flatScales) - Math.min(...flatScales);
    const loudSpread = Math.max(...loudScales) - Math.min(...loudScales);
    assert.ok(loudSpread > flatSpread);

    const drifts = loud.blocks.flatMap((b) => b.lines.map((l) => l.layout.offsetPct));
    assert.ok(drifts.some((d) => d !== 0));
    assert.ok(flat.blocks.every((b) => b.lines.every((l) => l.layout.offsetPct === 0)));
  });

  it('supports monochrome overlay and font packs', () => {
    const color = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      themeId: 'coastal-dusk',
      monochrome: false,
      fontId: 'editorial',
    });
    const mono = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      themeId: 'coastal-dusk',
      monochrome: true,
      fontId: 'mono',
    });
    assert.equal(mono.monochrome, true);
    assert.equal(mono.fontId, 'mono');
    assert.match(mono.fontFamily, /monospace/i);
    // Motif slot should lose chromatic difference vs full-color theme.
    assert.notEqual(mono.palette.motifs[0], color.palette.motifs[0]);
    assert.equal(mono.palette.motifs[0]?.slice(1, 3), mono.palette.motifs[0]?.slice(3, 5));
  });

  it('lab ornaments assign italic glow and font-mix faces when enabled', () => {
    const plain = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      enableItalics: false,
      enableGlow: false,
      enableFontMix: false,
    });
    assert.ok(
      plain.blocks
        .flatMap((b) => b.lines)
        .flatMap((l) => l.tokens)
        .every(
          (t) =>
            !t.isWord ||
            (!t.typography.italic && !t.typography.glow && t.typography.fontFace === 'primary'),
        ),
    );

    const ornate = compileLyricTypography(SAMPLE_PRETTY_LYRICS, {
      enableItalics: true,
      enableGlow: true,
      enableFontMix: true,
      fontMixStrength: 1.2,
      enableRepeatedPhrases: true,
    });
    const words = ornate.blocks
      .flatMap((b) => b.lines)
      .flatMap((l) => l.tokens)
      .filter((t) => t.isWord);
    const mixed = words.filter((t) => t.typography.fontFace !== 'primary');
    // Mix is sparse variance — primary face should still dominate the line.
    assert.ok(mixed.length > 0);
    assert.ok(mixed.length < words.length * 0.55);
    // Promoted faces should carry stronger analysis signals than typical primaries.
    const avgMixed =
      mixed.reduce(
        (s, t) =>
          s +
          t.evidence.motif +
          t.evidence.rarity +
          t.evidence.phraseMembership +
          t.typography.scale,
        0,
      ) / mixed.length;
    const primaries = words.filter((t) => t.typography.fontFace === 'primary');
    const avgPrimary =
      primaries.reduce(
        (s, t) =>
          s +
          t.evidence.motif +
          t.evidence.rarity +
          t.evidence.phraseMembership +
          t.typography.scale,
        0,
      ) / Math.max(1, primaries.length);
    assert.ok(avgMixed >= avgPrimary * 0.85);
    // Glow is sparse — at most a couple peaks, not motif washes across lines.
    const glowWords = words.filter((t) => t.typography.glow);
    assert.ok(glowWords.length <= Math.max(3, Math.ceil(words.length * 0.2)));
    assert.ok(words.some((t) => t.typography.glow || t.typography.italic));
  });
});

describe('prettyLyrics export', () => {
  it('round-trips options through the export envelope', () => {
    const exported = buildPrettyLyricsExport(
      { ...DEFAULT_PRETTY_LYRICS_OPTIONS, themeId: 'ink-amber', sizeVariance: 1.4 },
      'VC handoff',
    );
    const json = prettyLyricsExportToJson(exported);
    const parsed = parsePrettyLyricsExportJson(json);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.config.name, 'VC handoff');
    assert.equal(parsed.config.options.themeId, 'ink-amber');
    assert.equal(parsed.config.options.sizeVariance, 1.4);
    assert.equal(parsed.config.format, 'songpages.pretty-lyrics-config');
  });
});
