import type { PlaybackSessionEffect, PlaybackSessionEffectHandler } from '../effects';
import { PlaybackSessionImpl, type PlaybackSessionImplDeps } from '../PlaybackSessionImpl';
import type { PlaybackSession } from '../types';

export type TestPlaybackSessionOptions = {
  songs?: { id: number }[];
  queueAnchorSongId?: number | null;
  sessionSkippedIds?: ReadonlySet<number>;
  initialShuffle?: boolean;
  initialRepeatMode?: 'off' | 'one' | 'all';
};

/** Electron-less harness — records effects for characterization tests. */
export function createPlaybackSessionForTest(
  options: TestPlaybackSessionOptions = {},
): {
  session: PlaybackSession;
  effects: PlaybackSessionEffect[];
  flushEffects: () => PlaybackSessionEffect[];
} {
  const recordedEffects: PlaybackSessionEffect[] = [];
  const songs = options.songs ?? [{ id: 1 }, { id: 2 }, { id: 3 }];

  const onEffects: PlaybackSessionEffectHandler = (effects) => {
    recordedEffects.push(...effects);
  };

  const deps: PlaybackSessionImplDeps = {
    getQueueContext: () => ({
      queueAnchorSongId: options.queueAnchorSongId ?? songs[0]?.id ?? null,
      sortedSongs: songs,
      sessionSkippedIds: options.sessionSkippedIds ?? new Set(),
    }),
    onEffects,
  };

  const session = new PlaybackSessionImpl(deps);

  if (options.initialShuffle) {
    session.dispatch({ type: 'TOGGLE_SHUFFLE', source: 'system' });
    recordedEffects.length = 0;
  }
  if (options.initialRepeatMode && options.initialRepeatMode !== 'off') {
    while (session.getSnapshot().repeatMode !== options.initialRepeatMode) {
      session.dispatch({ type: 'CYCLE_REPEAT', source: 'system' });
    }
    recordedEffects.length = 0;
  }

  return {
    session,
    effects: recordedEffects,
    flushEffects: () => {
      const copy = [...recordedEffects];
      recordedEffects.length = 0;
      return copy;
    },
  };
}
