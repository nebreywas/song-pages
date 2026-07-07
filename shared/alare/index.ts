export {
  buildAlareTimeline,
  findActiveAlareLineIndex,
  resolveAlareScrollLinePosition,
  alareLineOpacity,
  alareVisibleWindow,
  alareOpacityProfile,
} from './buildTimeline';
export {
  alareBlockGapPx,
  alareLineStartsBlock,
  alareScrollOffsetPx,
  ALARE_BLOCK_GAP_LINE_RATIO,
} from './layout';
export {
  ALARE_SPEED_NUDGE_MAX,
  ALARE_SPEED_NUDGE_MAX_STEPS,
  ALARE_SPEED_NUDGE_STEP,
  accumulateAlareSpeedNudgeLines,
  alareLinesPerSecond,
  applyAlareSpeedNudge,
  clampAlareSpeedNudge,
} from './speedNudge';
export { parseAlareLyrics } from './parseLyrics';
export { resolveTrackDuration } from './resolveTrackDuration';
export type { ResolvedTrackDuration, TrackDurationSource } from './resolveTrackDuration';
export type {
  AlareLyricBlock,
  AlareLyricLine,
  AlareTimeline,
  AudioActivityWindow,
  BuildAlareTimelineInput,
} from './types';
