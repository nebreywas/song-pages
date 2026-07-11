/** Main-window playback actions triggered from VC commands (seek-back, stutter, play next). */

export const LISTENER_VOLUME_STEP = 0.05;

export type ListenerPlaybackCommand =
  | { type: 'seekRelative'; deltaSeconds: number }
  | { type: 'stutter'; durationMs: number }
  | { type: 'playNextSong' }
  | { type: 'volumeDelta'; delta: number }
  | { type: 'visualizerStep'; direction: 1 | -1 };
