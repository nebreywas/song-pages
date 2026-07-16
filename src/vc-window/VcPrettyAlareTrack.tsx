/**
 * VC Pretty Lyrics track — Sample 1 typography over ALARE scroll.
 * Palette background is never painted (transparent over VC cells).
 *
 * Center-drift must NOT use translateX(%) on a full-width block — that shifts by
 * % of the whole lyrics column and clips the first/last glyphs (see VC narrow cells).
 * We reserve a horizontal gutter and drift a shrink-wrapped inner span instead.
 *
 * Optional soft-breaks split long/dense lines into related visual rows inside the
 * same ALARE line index (timeline stays 1:1 with source lines).
 */

import { Fragment, memo, useMemo, type CSSProperties, type ReactNode } from 'react';

import type { AlareLyricLine } from '@shared/alare';
import { alareLineStartsBlock } from '@shared/alare';
import type { LyricLinePresentation } from '@shared/lyricEffects';
import {
  compileLyricTypography,
  DEFAULT_VC_PRETTY_LYRICS_OPTIONS,
  planPlainLineSoftBreak,
  planPrettyLineSoftBreak,
  SOFT_BREAK_RELATED_SPACING_RATIO,
  type LyricTypographyManifest,
  type TypographyLine,
  type TypographyPalette,
  type TypographyToken,
} from '@shared/prettyLyrics';

import { composeLineStyle, pulseIntensityByWord, pulseStyle } from './lyricEffects/renderLyricEffectText';

function resolveTokenColor(token: TypographyToken, palette: TypographyPalette): string {
  const role = token.typography.colorRole;
  if (role === 'quiet') return palette.quiet;
  if (role === 'base') return palette.base;
  if (role.startsWith('accent-')) {
    const i = Number(role.slice('accent-'.length)) || 0;
    return palette.accents[i % palette.accents.length] ?? palette.accents[0]!;
  }
  if (role.startsWith('motif-')) {
    const i = Number(role.slice('motif-'.length)) || 0;
    return palette.motifs[i % palette.motifs.length] ?? palette.motifs[0]!;
  }
  if (role.startsWith('underline-')) {
    const i = Number(role.slice('underline-'.length)) || 0;
    return palette.underline[i % palette.underline.length] ?? palette.underline[0]!;
  }
  return palette.base;
}

const PrettyToken = memo(function PrettyToken({
  token,
  palette,
  wordIndex,
  pulseIntensity,
}: {
  token: TypographyToken;
  palette: TypographyPalette;
  wordIndex: number;
  pulseIntensity: number;
}) {
  if (!token.isWord) {
    return <span className="vc-pretty-lyric-sep">{token.rawText}</span>;
  }
  const style: CSSProperties = {
    color: resolveTokenColor(token, palette),
    fontSize: `calc(1em * ${token.typography.scale})`,
    fontWeight: token.typography.weight,
    // Pulse boosts opacity on top of pretty roles without inventing emphasis meaning.
    opacity: Math.min(1, token.typography.opacity * (0.85 + pulseIntensity * 0.2)),
    textDecoration: token.typography.underline ? 'underline' : undefined,
    ...(pulseIntensity > 0 ? pulseStyle(pulseIntensity) : {}),
  };
  return (
    <span
      className={`vc-pretty-lyric-token role-${token.typography.role}${
        pulseIntensity > 0 ? ' vc-lyric-fx-pulse' : ''
      }`}
      data-word-index={wordIndex}
      style={style}
    >
      {token.rawText}
    </span>
  );
});

/** Render tokens with optional Energy/Beat Pulse mapped by word index. */
function renderTokenRun(
  tokens: TypographyToken[],
  palette: TypographyPalette,
  pulseByWord: Map<number, number>,
  wordIndexStart = 0,
): { nodes: ReactNode; nextWordIndex: number } {
  let wordIndex = wordIndexStart;
  const nodes = tokens.map((token) => {
    if (!token.isWord) {
      return (
        <PrettyToken key={token.id} token={token} palette={palette} wordIndex={-1} pulseIntensity={0} />
      );
    }
    const wi = wordIndex;
    wordIndex += 1;
    return (
      <PrettyToken
        key={token.id}
        token={token}
        palette={palette}
        wordIndex={wi}
        pulseIntensity={pulseByWord.get(wi) ?? 0}
      />
    );
  });
  return { nodes, nextWordIndex: wordIndex };
}

function PrettyLineBody({
  prettyLine,
  palette,
  fallbackText,
  softBreakEnabled,
  pulseByWord,
}: {
  prettyLine: TypographyLine | undefined;
  palette: TypographyPalette;
  fallbackText: string;
  softBreakEnabled: boolean;
  pulseByWord: Map<number, number>;
}) {
  if (!prettyLine) {
    if (!softBreakEnabled) return <>{fallbackText}</>;
    const plan = planPlainLineSoftBreak(fallbackText);
    if (!plan) return <>{fallbackText}</>;
    const row1 = fallbackText.slice(0, plan.breakAtCharIndex).trimEnd();
    const row2 = fallbackText.slice(plan.breakAtCharIndex).trimStart();
    return (
      <span className="vc-pretty-soft-break" data-soft-break={plan.reason}>
        <span className="vc-pretty-soft-break-row">{row1}</span>
        <span
          className="vc-pretty-soft-break-row is-continuation"
          style={{
            // Match Pretty path: ~35% of a typical natural line gap.
            marginTop: `${0.35 * 0.55 * SOFT_BREAK_RELATED_SPACING_RATIO}em`,
          }}
        >
          {row2}
        </span>
      </span>
    );
  }

  if (!softBreakEnabled) {
    return <>{renderTokenRun(prettyLine.tokens, palette, pulseByWord).nodes}</>;
  }

  const plan = planPrettyLineSoftBreak(prettyLine);
  if (!plan) {
    return <>{renderTokenRun(prettyLine.tokens, palette, pulseByWord).nodes}</>;
  }

  const row1 = prettyLine.tokens.slice(0, plan.breakAtTokenIndex);
  const row2 = prettyLine.tokens.slice(plan.breakAtTokenIndex);
  // Forced soft-returns sit much closer than natural lyric-line gaps (~35% of natural).
  const naturalGapEm = prettyLine.layout.spaceAfter * 0.35;
  const relatedGapEm = naturalGapEm * SOFT_BREAK_RELATED_SPACING_RATIO;
  // Keep word indices continuous across soft-break rows so lyric pulses stay aligned.
  const first = renderTokenRun(row1, palette, pulseByWord, 0);
  const second = renderTokenRun(row2, palette, pulseByWord, first.nextWordIndex);

  return (
    <span className="vc-pretty-soft-break" data-soft-break={plan.reason}>
      <span className="vc-pretty-soft-break-row">{first.nodes}</span>
      <span
        className="vc-pretty-soft-break-row is-continuation"
        style={{ marginTop: `${relatedGapEm}em` }}
      >
        {second.nodes}
      </span>
    </span>
  );
}

type VcPrettyAlareTrackProps = {
  /** Source lyrics already normalized for ALARE. */
  lyricsText: string;
  alareLines: AlareLyricLine[];
  scrollLinePosition: number;
  blockGapPx?: number;
  lineOpacity: (lineIndex: number, scrollPos: number) => number;
  /** Base font size for relative pretty token scales. */
  baseFontSizePx: number;
  fontFamily: string;
  /** Soft-return long/dense lines inside the same ALARE slot. */
  softBreakLongLines?: boolean;
  /** Agnostic lyric effects (Energy Pulse / Beat Pulse) — painted onto pretty tokens. */
  lineEffects?: Record<string, LyricLinePresentation>;
};

/**
 * Renders ALARE line track using Pretty Lyrics token styles.
 * Aligns pretty lines to ALARE lines by index (same blank-line block model).
 * Scroll still uses uniform ALARE slots for this stub — pixel-height map comes later.
 */
export function VcPrettyAlareTrack({
  lyricsText,
  alareLines,
  scrollLinePosition,
  blockGapPx,
  lineOpacity,
  baseFontSizePx,
  fontFamily,
  softBreakLongLines = false,
  lineEffects,
}: VcPrettyAlareTrackProps) {
  const manifest: LyricTypographyManifest = useMemo(
    () => compileLyricTypography(lyricsText, DEFAULT_VC_PRETTY_LYRICS_OPTIONS),
    [lyricsText],
  );

  const prettyLines = useMemo(
    () => manifest.blocks.flatMap((block) => block.lines),
    [manifest],
  );

  // Gutter so center-drift translate stays inside the clip rect on full-width lines.
  const driftGutterPct = Math.max(0, DEFAULT_VC_PRETTY_LYRICS_OPTIONS.centerDriftPct) + 1;

  const gapStyle =
    blockGapPx != null && blockGapPx > 0 ? { height: blockGapPx, minHeight: blockGapPx } : undefined;

  const trackStyle = {
    fontFamily: manifest.fontFamily || fontFamily,
    fontSize: `${baseFontSizePx}px`,
    letterSpacing: `${manifest.letterSpacingEm}em`,
    wordSpacing: `${manifest.wordSpacingEm}em`,
    // Never paint theme background in VC — cell / surface shows through.
    background: 'transparent',
    color: manifest.palette.base,
  } as CSSProperties;

  return (
    <div
      className="vc-pretty-alare-track"
      style={trackStyle}
      data-pretty-config="sample-1"
      data-soft-break={softBreakLongLines ? 'on' : 'off'}
    >
      {alareLines.map((line, lineIndex) => {
        const prettyLine = prettyLines[lineIndex];
        const fx = lineEffects?.[line.id];
        const pulseByWord = pulseIntensityByWord(fx);
        const baseOpacity = lineOpacity(lineIndex, scrollLinePosition);
        const offsetPct = prettyLine?.layout.offsetPct ?? 0;
        const lineScale = prettyLine?.layout.scale ?? 1;
        const centered = true; // Sample 1 / editorial-neon is a centered layout
        const lineChrome = composeLineStyle(baseOpacity, fx);

        return (
          <Fragment key={line.id}>
            {alareLineStartsBlock(lineIndex, line) ? (
              <div className="vc-alare-lyrics-block-gap" style={gapStyle} aria-hidden="true" />
            ) : null}
            <div
              className={`vc-alare-lyrics-line vc-pretty-lyric-line${
                Math.round(scrollLinePosition) === lineIndex ? ' is-active' : ''
              }`}
              data-line-id={line.id}
              style={{
                ...lineChrome,
                fontSize: `calc(1em * ${lineScale})`,
                textAlign: centered ? 'center' : undefined,
                // Reserve horizontal room equal to max drift so translate can't clip glyphs.
                paddingInline: `${driftGutterPct}%`,
                boxSizing: 'border-box',
                marginTop: prettyLine ? `${prettyLine.layout.spaceBefore * 0.35}em` : undefined,
                marginBottom: prettyLine ? `${prettyLine.layout.spaceAfter * 0.35}em` : undefined,
              }}
            >
              <span
                className="vc-pretty-lyric-line-inner"
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  // % is of this shrink-wrapped (or max-width) span — not the full column.
                  transform: offsetPct ? `translateX(${offsetPct}%)` : undefined,
                }}
              >
                <PrettyLineBody
                  prettyLine={prettyLine}
                  palette={manifest.palette}
                  fallbackText={line.text}
                  softBreakEnabled={softBreakLongLines}
                  pulseByWord={pulseByWord}
                />
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
