import type { ManualNextAction, ManualPreviousAction } from '@shared/playback/policies/manualAdvance';
import type { TrackEndAdvanceAction } from '@shared/playback/detours/state';

/** Side effects the host (ListenerMode) executes — session owns policy, not media. */
export type PlaybackSessionEffect =
  | { type: 'manual-next'; action: ManualNextAction }
  | { type: 'manual-previous'; action: ManualPreviousAction }
  | { type: 'track-end'; action: TrackEndAdvanceAction }
  | { type: 'toggle-play-pause' }
  | { type: 'seek'; time: number }
  | { type: 'release-play-lock-if-scheduled' }
  | { type: 'resume-after-wait' }
  | { type: 'volume-delta'; delta: number };

export type PlaybackSessionEffectHandler = (effects: PlaybackSessionEffect[]) => void;
