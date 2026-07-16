/**
 * Playback commands — evolvable product vocabulary routed through PlaybackSession.
 * The union will grow/shrink over time; keep dispatch boundaries stable.
 */

export type PlaybackCommandSource =
  | 'player-ui'
  | 'vc-surface'
  | 'vc-controller'
  | 'keyboard'
  | 'context-menu'
  | 'system'
  | 'external';

/** User- or system-requested playback actions. */
export type PlaybackCommand =
  | { type: 'TOGGLE_PLAY_PAUSE'; source: PlaybackCommandSource }
  | { type: 'PREVIOUS'; source: PlaybackCommandSource }
  | { type: 'NEXT'; source: PlaybackCommandSource }
  | { type: 'SEEK'; source: PlaybackCommandSource; time: number }
  | {
      type: 'PLAY_TRACK';
      source: PlaybackCommandSource;
      songId: number;
      userInitiated?: boolean;
      startAt?: number;
    }
  | { type: 'PLAY_NOW'; source: PlaybackCommandSource; songId: number }
  | { type: 'QUEUE_ON_DECK'; source: PlaybackCommandSource; songId: number }
  | { type: 'DISMISS_ON_DECK'; source: PlaybackCommandSource }
  | { type: 'RESUME_AFTER_WAIT'; source: PlaybackCommandSource }
  | { type: 'CYCLE_REPEAT'; source: PlaybackCommandSource }
  | { type: 'TOGGLE_SHUFFLE'; source: PlaybackCommandSource }
  | { type: 'VOLUME_DELTA'; source: PlaybackCommandSource; delta: number }
  | { type: 'TOGGLE_PLAY_LOCK'; source: PlaybackCommandSource }
  | { type: 'SET_PLAY_LOCK'; source: PlaybackCommandSource; enabled: boolean }
  | {
      type: 'SET_PLAY_LOCK_RELEASE';
      source: PlaybackCommandSource;
      enabled: boolean;
    };

export const PLAYBACK_COMMAND_TYPES = [
  'TOGGLE_PLAY_PAUSE',
  'PREVIOUS',
  'NEXT',
  'SEEK',
  'PLAY_TRACK',
  'PLAY_NOW',
  'QUEUE_ON_DECK',
  'DISMISS_ON_DECK',
  'RESUME_AFTER_WAIT',
  'CYCLE_REPEAT',
  'TOGGLE_SHUFFLE',
  'VOLUME_DELTA',
  'TOGGLE_PLAY_LOCK',
  'SET_PLAY_LOCK',
  'SET_PLAY_LOCK_RELEASE',
] as const satisfies readonly PlaybackCommand['type'][];

export type PlaybackCommandType = (typeof PLAYBACK_COMMAND_TYPES)[number];

/** Narrow unknown IPC / dev-console payloads before dispatch. */
export function isPlaybackCommandType(value: unknown): value is PlaybackCommandType {
  return typeof value === 'string' && (PLAYBACK_COMMAND_TYPES as readonly string[]).includes(value);
}
