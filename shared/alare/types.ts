/**
 * ALARE — Approximate Lyric Allocation & Rendering Engine (types).
 * @see documentation/ALARE.md
 */

export type AudioActivityWindow = {
  startTime: number;
  endTime: number;
  energy: number;
  activityScore: number;
};

export type AlareLyricLine = {
  id: string;
  text: string;
  characterCount: number;
  wordCount: number;
  estimatedSyllables: number;
  timingWeight: number;
  blockId: string;
  blockIndex: number;
  lineIndexInBlock: number;
  startTime: number;
  endTime: number;
};

export type AlareLyricBlock = {
  id: string;
  lines: AlareLyricLine[];
  startTime: number;
  endTime: number;
};

export type AlareTimeline = {
  songId: string;
  totalDuration: number;
  durationSource: 'manifest' | 'playback';
  analyticalText: string;
  totalCharacters: number;
  totalWords: number;
  estimatedTotalSyllables: number;
  blocks: AlareLyricBlock[];
  lines: AlareLyricLine[];
  /** High values suggest timeline compression; useful for debug UI. */
  densityPressure: number;
  audioActivity?: AudioActivityWindow[];
};

export type BuildAlareTimelineInput = {
  songId: string;
  /** Raw stored lyrics — normalized internally. */
  lyricsText: string;
  manifestDurationSeconds?: number | null;
  playbackDurationSeconds: number;
};
