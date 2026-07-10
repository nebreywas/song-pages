/** Main-window playback actions triggered from VC commands (seek-back, stutter, play next). */

export type ListenerPlaybackCommand =
  | { type: 'seekRelative'; deltaSeconds: number }
  | { type: 'stutter'; durationMs: number }
  | { type: 'playNextSong' };
