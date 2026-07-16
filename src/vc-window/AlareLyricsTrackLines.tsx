import { Fragment } from 'react';

import type { AlareLyricLine } from '@shared/alare';
import { alareLineStartsBlock } from '@shared/alare';
import type { LyricLinePresentation } from '@shared/lyricEffects';

import { composeLineStyle, renderLyricEffectText } from './lyricEffects/renderLyricEffectText';

type AlareLyricsTrackLinesProps = {
  lines: AlareLyricLine[];
  scrollLinePosition: number;
  blockGapPx?: number;
  lineOpacity: (lineIndex: number, scrollPos: number) => number;
  /** Optional per-line presentation from an agnostic lyric effect. */
  lineEffects?: Record<string, LyricLinePresentation>;
};

/** Renders lyric lines with preserved blank-line section gaps. */
export function AlareLyricsTrackLines({
  lines,
  scrollLinePosition,
  blockGapPx,
  lineOpacity,
  lineEffects,
}: AlareLyricsTrackLinesProps) {
  const gapStyle = blockGapPx != null && blockGapPx > 0 ? { height: blockGapPx, minHeight: blockGapPx } : undefined;

  return (
    <>
      {lines.map((line, lineIndex) => {
        const fx = lineEffects?.[line.id];
        const baseOpacity = lineOpacity(lineIndex, scrollLinePosition);
        return (
          <Fragment key={line.id}>
            {alareLineStartsBlock(lineIndex, line) ? (
              <div className="vc-alare-lyrics-block-gap" style={gapStyle} aria-hidden="true" />
            ) : null}
            <div
              className={`vc-alare-lyrics-line${
                Math.round(scrollLinePosition) === lineIndex ? ' is-active' : ''
              }`}
              data-line-id={line.id}
              style={composeLineStyle(baseOpacity, fx)}
            >
              {renderLyricEffectText(line.text, fx)}
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
