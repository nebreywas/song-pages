/**
 * Playback events — facts emitted after state transitions (not command acknowledgements).
 * Phase 1 defines types only; emission begins in Phase 3+.
 */

import type { PlaybackCommandSource } from './commands';
import type { PlaybackRejectReason } from './results';

export type PlaybackEvent =
  | {
      type: 'TRACK_STARTED';
      trackId: number;
      source: PlaybackCommandSource | 'system';
    }
  | {
      type: 'TRACK_ENDED';
      trackId: number;
    }
  | {
      type: 'PLAYBACK_FAILED';
      trackId: number | null;
      message?: string;
    }
  | {
      type: 'PHASE_CHANGED';
      phase: 'playing' | 'paused' | 'waiting-for-host';
    }
  | {
      type: 'COMMAND_REJECTED';
      commandType: string;
      reason: PlaybackRejectReason;
    }
  | {
      type: 'PLAY_LOCK_CHANGED';
      enabled: boolean;
      releaseOnNext: boolean;
    };

export const PLAYBACK_EVENT_TYPES = [
  'TRACK_STARTED',
  'TRACK_ENDED',
  'PLAYBACK_FAILED',
  'PHASE_CHANGED',
  'COMMAND_REJECTED',
  'PLAY_LOCK_CHANGED',
] as const satisfies readonly PlaybackEvent['type'][];
