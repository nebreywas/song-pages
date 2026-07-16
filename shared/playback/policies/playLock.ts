/** Play Lock — blocks actions that would change live playback trajectory during VC. */

export type PlayLockGateContext = {
  playingSongId: number | null;
  targetSongId?: number | null;
};

/** True when Play Lock is on and this action must be ignored. */
export function isVcPlayLockBlocking(
  playLockEnabled: boolean,
  action:
    | 'change-song'
    | 'prev'
    | 'next'
    | 'play-now'
    | 'on-deck'
    | 'play-next-song'
    | 'start-idle-playback'
    | 'playlist-double-click',
  context: PlayLockGateContext,
): boolean {
  if (!playLockEnabled) return false;

  switch (action) {
    case 'prev':
    case 'next':
    case 'play-now':
    case 'on-deck':
    case 'play-next-song':
    case 'playlist-double-click':
      return true;
    case 'start-idle-playback':
      return context.playingSongId == null;
    case 'change-song':
      if (context.playingSongId == null) return false;
      if (context.targetSongId == null) return true;
      return context.targetSongId !== context.playingSongId;
    default:
      return false;
  }
}

/** Custom playlist entries cannot be removed while they are playing under Play Lock. */
export function isVcPlayLockBlockingSongRemoval(
  playLockEnabled: boolean,
  playingSongId: number | null,
  songId: number,
): boolean {
  return playLockEnabled && playingSongId != null && playingSongId === songId;
}

/** Natural track-end actions that should auto-release Play Lock when release-on-next is on. */
export type NaturalTrackEndAction =
  | 'repeat-current'
  | 'play-on-deck'
  | 'resume-interrupt'
  | 'repeat-primary-anchor'
  | 'advance-primary'
  | 'stop';

export function shouldReleasePlayLockOnNaturalAdvance(action: NaturalTrackEndAction): boolean {
  return action !== 'repeat-current' && action !== 'stop';
}
