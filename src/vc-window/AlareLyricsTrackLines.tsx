import { Fragment } from 'react';

import type { AlareLyricLine } from '@shared/alare';
import { alareLineStartsBlock } from '@shared/alare';

type AlareLyricsTrackLinesProps = {
  lines: AlareLyricLine[];
  scrollLinePosition: number;
  blockGapPx?: number;
  lineOpacity: (lineIndex: number, scrollPos: number) => number;
};

/** Renders lyric lines with preserved blank-line section gaps. */
export function AlareLyricsTrackLines({
  lines,
  scrollLinePosition,
  blockGapPx,
  lineOpacity,
}: AlareLyricsTrackLinesProps) {
  const gapStyle = blockGapPx != null && blockGapPx > 0 ? { height: blockGapPx, minHeight: blockGapPx } : undefined;

  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={line.id}>
          {alareLineStartsBlock(lineIndex, line) ? (
            <div className="vc-alare-lyrics-block-gap" style={gapStyle} aria-hidden="true" />
          ) : null}
          <div
            className={`vc-alare-lyrics-line${
              Math.round(scrollLinePosition) === lineIndex ? ' is-active' : ''
            }`}
            style={{ opacity: lineOpacity(lineIndex, scrollLinePosition) }}
          >
            {line.text}
          </div>
        </Fragment>
      ))}
    </>
  );
}
