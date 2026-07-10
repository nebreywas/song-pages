import { parseAlareLyrics } from '../alare/parseLyrics';

import { MARQUEE_SECTION_GAP_SPACES } from './constants';

export type MarqueeLyricsLayout = {
  /** Single-line marquee text shown in VC. */
  text: string;
  /** Character index in `text` where each ALARE lyric line begins. */
  lineCharStarts: number[];
};

/**
 * Flatten normalized lyrics into one marquee line.
 * Within a section, lines join with a single space; sections join with a wide space gap.
 */
export function buildMarqueeLyricsLayout(lyricsText: string): MarqueeLyricsLayout {
  const parsed = parseAlareLyrics(lyricsText);
  const sectionGap = ' '.repeat(MARQUEE_SECTION_GAP_SPACES);
  const lineCharStarts: number[] = [];
  let text = '';

  parsed.blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0 && block.lines.length > 0) {
      text += sectionGap;
    }

    block.lines.forEach((line, lineIndexInBlock) => {
      if (lineIndexInBlock > 0) {
        text += ' ';
      }
      const flatLine = line.text.replace(/\s+/g, ' ').trim();
      if (!flatLine) return;
      lineCharStarts.push(text.length);
      text += flatLine;
    });
  });

  // Guarantee one physical line — any stray newlines become spaces.
  text = text.replace(/\n+/g, ' ');

  return { text, lineCharStarts };
}
