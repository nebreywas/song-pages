import type { ListenerPlaybackCommand } from '@shared/listener/playbackCommands';

import type { PlaybackSession } from '../types';

/** Local audio commands that stay on the main element (not session policy). */
export type KeyboardMediaDeps = {
  seekRelative: (deltaSeconds: number) => void;
  stutter: (durationMs: number) => void;
  canSeekBack: (deltaSeconds: number) => boolean;
  recordSeekBack: (deltaSeconds: number) => void;
};

export type KeyboardTransportAdapterDeps = {
  session: PlaybackSession;
  media: KeyboardMediaDeps;
  onVisualizerStep?: (direction: 1 | -1) => void;
  onToggleLiveDebug?: () => void;
};

/**
 * Global shortcut / command-service playback commands → session dispatch or local media.
 * play-next-song routes through RESUME_AFTER_WAIT (special pause resume).
 */
export function handleKeyboardPlaybackCommand(
  command: ListenerPlaybackCommand,
  deps: KeyboardTransportAdapterDeps,
): void {
  const { session } = deps;

  switch (command.type) {
    case 'volumeDelta':
      session.dispatch({ type: 'VOLUME_DELTA', source: 'keyboard', delta: command.delta });
      return;
    case 'visualizerStep':
      deps.onVisualizerStep?.(command.direction);
      return;
    case 'toggleLiveDebug':
      deps.onToggleLiveDebug?.();
      return;
    case 'playNextSong':
      if (session.isTrajectoryChangeBlocked('play-next-song')) return;
      session.dispatch({ type: 'RESUME_AFTER_WAIT', source: 'keyboard' });
      return;
    case 'seekRelative': {
      if (!deps.media.canSeekBack(command.deltaSeconds)) return;
      deps.media.recordSeekBack(command.deltaSeconds);
      deps.media.seekRelative(command.deltaSeconds);
      return;
    }
    case 'stutter':
      deps.media.stutter(command.durationMs);
      return;
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}
