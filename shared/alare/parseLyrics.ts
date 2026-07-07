import { normalizeAlareLyricsText } from '../lyricsText';

export type ParsedAlareLine = {
  id: string;
  text: string;
  blockId: string;
  blockIndex: number;
  lineIndexInBlock: number;
};

export type ParsedAlareLyrics = {
  analyticalText: string;
  blocks: Array<{ id: string; lines: ParsedAlareLine[] }>;
  lines: ParsedAlareLine[];
};

/**
 * Normalize lyric blob into ALARE blocks (blank-line separated) and lines.
 */
export function parseAlareLyrics(lyricsText: string): ParsedAlareLyrics {
  const analyticalText = normalizeAlareLyricsText(lyricsText);
  const rawBlocks = analyticalText.split(/\n{2,}/);

  const blocks: ParsedAlareLyrics['blocks'] = [];
  const lines: ParsedAlareLine[] = [];

  rawBlocks.forEach((blockText, blockIndex) => {
    const blockLines = blockText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (blockLines.length === 0) return;

    const blockId = `block-${blockIndex}`;
    const parsedBlockLines: ParsedAlareLine[] = blockLines.map((text, lineIndexInBlock) => {
      const line: ParsedAlareLine = {
        id: `line-${blockIndex}-${lineIndexInBlock}`,
        text,
        blockId,
        blockIndex,
        lineIndexInBlock,
      };
      lines.push(line);
      return line;
    });

    blocks.push({ id: blockId, lines: parsedBlockLines });
  });

  return { analyticalText, blocks, lines };
}
