import { PlaybackSessionImpl, type PlaybackSessionImplDeps } from './PlaybackSessionImpl';
import type { PlaybackSession } from './types';

/** App-lifetime playback session. */
export function createPlaybackSession(deps: PlaybackSessionImplDeps): PlaybackSession {
  return new PlaybackSessionImpl(deps);
}

export type { PlaybackSessionImpl, PlaybackSessionImplDeps } from './PlaybackSessionImpl';
