import {
  ALARE_BLOCK_GAP_SEC,
  ALARE_INTRO_RESERVE_PCT,
  ALARE_MIN_LINE_DURATION_SEC,
  ALARE_OUTRO_RESERVE_PCT,
} from './constants';
import { lineMetrics } from './metrics';
import { parseAlareLyrics } from './parseLyrics';
import { resolveTrackDuration } from './resolveTrackDuration';
import type { AlareLyricBlock, AlareLyricLine, AlareTimeline, BuildAlareTimelineInput } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function applyDensityPressure(
  introPct: number,
  outroPct: number,
  blockGapSec: number,
  densityPressure: number,
): { introPct: number; outroPct: number; blockGapSec: number } {
  if (densityPressure <= 1) {
    return { introPct, outroPct, blockGapSec };
  }
  const factor = clamp(1 / densityPressure, 0.35, 1);
  return {
    introPct: introPct * factor,
    outroPct: outroPct * factor,
    blockGapSec: blockGapSec * factor,
  };
}

/**
 * Build a monotonic approximate line timeline from duration and lyric density.
 */
export function buildAlareTimeline(input: BuildAlareTimelineInput): AlareTimeline | null {
  const parsed = parseAlareLyrics(input.lyricsText);
  if (parsed.lines.length === 0) return null;

  const { seconds: totalDuration, source: durationSource } = resolveTrackDuration(
    input.manifestDurationSeconds,
    input.playbackDurationSeconds,
  );
  if (totalDuration <= 0) return null;

  const metricLines = parsed.lines.map((line) => ({
    ...line,
    ...lineMetrics(line),
  }));

  const totalWeight = metricLines.reduce((sum, line) => sum + line.timingWeight, 0);
  const blockCount = parsed.blocks.length;
  const blockGapCount = Math.max(0, blockCount - 1);

  let introPct = ALARE_INTRO_RESERVE_PCT;
  let outroPct = ALARE_OUTRO_RESERVE_PCT;
  let blockGapSec = ALARE_BLOCK_GAP_SEC;

  const introReserve = totalDuration * introPct;
  const outroReserve = totalDuration * outroPct;
  let available = totalDuration - introReserve - outroReserve - blockGapCount * blockGapSec;
  let densityPressure = totalWeight / Math.max(available, 1);

  const adjusted = applyDensityPressure(introPct, outroPct, blockGapSec, densityPressure);
  introPct = adjusted.introPct;
  outroPct = adjusted.outroPct;
  blockGapSec = adjusted.blockGapSec;

  const contentStart = totalDuration * introPct;
  const contentEnd = totalDuration * (1 - outroPct);
  const contentDuration = Math.max(0, contentEnd - contentStart);
  const totalBlockGapTime = blockGapCount * blockGapSec;
  const linePool = Math.max(0, contentDuration - totalBlockGapTime);

  densityPressure = totalWeight / Math.max(linePool, 1);

  const rawDurations = metricLines.map((line) => (line.timingWeight / totalWeight) * linePool);
  const minTotal = ALARE_MIN_LINE_DURATION_SEC * metricLines.length;
  let durations = rawDurations;
  if (linePool > 0 && minTotal > linePool) {
    const scale = linePool / minTotal;
    durations = metricLines.map(() => ALARE_MIN_LINE_DURATION_SEC * scale);
  } else {
    durations = durations.map((d) => Math.max(d, ALARE_MIN_LINE_DURATION_SEC));
    const durationSum = durations.reduce((a, b) => a + b, 0);
    if (durationSum > linePool && durationSum > 0) {
      const scale = linePool / durationSum;
      durations = durations.map((d) => d * scale);
    }
  }

  const scheduled: AlareLyricLine[] = [];
  let cursor = contentStart;

  metricLines.forEach((line, index) => {
    const startTime = cursor;
    const endTime = startTime + durations[index]!;
    cursor = endTime;

    const next = metricLines[index + 1];
    if (next && next.blockId !== line.blockId) {
      cursor += blockGapSec;
    }

    scheduled.push({
      id: line.id,
      text: line.text,
      characterCount: line.characterCount,
      wordCount: line.wordCount,
      estimatedSyllables: line.estimatedSyllables,
      timingWeight: line.timingWeight,
      blockId: line.blockId,
      blockIndex: line.blockIndex,
      lineIndexInBlock: line.lineIndexInBlock,
      startTime,
      endTime,
    });
  });

  const blocks: AlareLyricBlock[] = parsed.blocks.map((block) => {
    const blockLines = scheduled.filter((line) => line.blockId === block.id);
    return {
      id: block.id,
      lines: blockLines,
      startTime: blockLines[0]?.startTime ?? 0,
      endTime: blockLines[blockLines.length - 1]?.endTime ?? 0,
    };
  });

  const totals = scheduled.reduce(
    (acc, line) => ({
      characters: acc.characters + line.characterCount,
      words: acc.words + line.wordCount,
      syllables: acc.syllables + line.estimatedSyllables,
    }),
    { characters: 0, words: 0, syllables: 0 },
  );

  return {
    songId: input.songId,
    totalDuration,
    durationSource,
    analyticalText: parsed.analyticalText,
    totalCharacters: totals.characters,
    totalWords: totals.words,
    estimatedTotalSyllables: totals.syllables,
    blocks,
    lines: scheduled,
    densityPressure,
  };
}

/** Index of the line active at `currentTime` (seek/pause use playback clock). */
export function findActiveAlareLineIndex(lines: AlareLyricLine[], currentTime: number): number {
  if (lines.length === 0) return 0;
  if (currentTime <= lines[0]!.startTime) return 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (currentTime >= line.startTime && currentTime < line.endTime) return i;
  }

  return lines.length - 1;
}

/**
 * Continuous scroll position in line-index space (fractional).
 * Must be monotonic in time — no snap-back at line/gap boundaries.
 */
export function resolveAlareScrollLinePosition(lines: AlareLyricLine[], currentTime: number): number {
  if (lines.length === 0) return 0;
  if (currentTime <= lines[0]!.startTime) return 0;

  const last = lines[lines.length - 1]!;
  if (currentTime >= last.endTime) return lines.length - 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (currentTime >= line.startTime && currentTime <= line.endTime) {
      const span = line.endTime - line.startTime;
      const progress = span > 0 ? (currentTime - line.startTime) / span : 1;
      return Math.min(lines.length - 1, i + progress);
    }

    const next = lines[i + 1];
    if (next && currentTime > line.endTime && currentTime < next.startTime) {
      return Math.min(lines.length - 1, i + 1);
    }
  }

  return lines.length - 1;
}

/** Opacity for a line at `lineIndex` given continuous scroll position. */
export function alareLineOpacity(
  lineIndex: number,
  scrollLinePosition: number,
  fadeEnabled: boolean,
  visibleRadius: number,
): number {
  if (!fadeEnabled) return 1;
  const radius = Math.max(0.5, visibleRadius);
  const distance = Math.abs(lineIndex - scrollLinePosition);
  if (distance >= radius) return 0.5;
  const t = distance / radius;
  return 0.5 + (1 - t) * 0.5;
}

/** Visible line window centered on the active line. */
export function alareVisibleWindow(
  lineCount: number,
  activeIndex: number,
  visibleLineCount: number,
): { startIndex: number; endIndex: number } {
  const count = Math.max(1, visibleLineCount);
  const before = Math.floor((count - 1) / 2);
  let startIndex = Math.max(0, activeIndex - before);
  let endIndex = Math.min(lineCount - 1, startIndex + count - 1);
  startIndex = Math.max(0, endIndex - count + 1);
  return { startIndex, endIndex };
}

/**
 * Per-line opacity for ALARE fade mode — brightest at center (ALARE §11.4).
 */
export function alareOpacityProfile(visibleLineCount: number, fadeEnabled: boolean): number[] {
  const count = Math.max(1, visibleLineCount);
  if (!fadeEnabled) return Array.from({ length: count }, () => 1);

  if (count === 1) return [1];

  const center = (count - 1) / 2;
  const maxDistance = Math.max(center, count - 1 - center);

  return Array.from({ length: count }, (_, index) => {
    const distance = Math.abs(index - center);
    const t = maxDistance > 0 ? distance / maxDistance : 0;
    return 0.5 + (1 - t) * 0.5;
  });
}
