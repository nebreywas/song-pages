import type { VcTransportCommand } from '@shared/vcMode/vcTransport';

import type { PlaybackSession } from '../types';

/** Media bridge callbacks — VC widget timing/end events are not PlaybackCommands. */
export type VcTransportMediaDeps = {
  onYoutubeEnded: () => void;
  onSoundcloudEnded: () => void;
  onYoutubeDuration: (seconds: number) => void;
  onYoutubeTiming: (currentTime: number, duration: number) => void;
  onSoundcloudTiming: (currentTime: number, duration: number) => void;
};

export type VcTransportAdapterDeps = {
  session: PlaybackSession;
  getSortedSongs: () => { id: number }[];
  playSong: (songId: number) => void;
  media: VcTransportMediaDeps;
};

/**
 * VC projection surface transport → session dispatch (or media bridge for widget events).
 * Input generates commands; this adapter does not execute queue policy.
 */
export function handleVcTransportCommand(
  command: VcTransportCommand,
  deps: VcTransportAdapterDeps,
): void {
  const { session } = deps;

  switch (command.type) {
    case 'playPause':
      session.dispatch({ type: 'TOGGLE_PLAY_PAUSE', source: 'vc-surface' });
      return;
    case 'prev':
      session.dispatch({ type: 'PREVIOUS', source: 'vc-surface' });
      return;
    case 'next':
      session.dispatch({ type: 'NEXT', source: 'vc-surface' });
      return;
    case 'seek':
      session.dispatch({ type: 'SEEK', source: 'vc-surface', time: command.seconds });
      return;
    case 'playSong': {
      if (session.isTrajectoryChangeBlocked('change-song', command.songId)) return;
      const exists = deps.getSortedSongs().some((song) => song.id === command.songId);
      if (exists) deps.playSong(command.songId);
      return;
    }
    case 'playNextSong':
      if (session.isTrajectoryChangeBlocked('play-next-song')) return;
      session.dispatch({ type: 'RESUME_AFTER_WAIT', source: 'vc-surface' });
      return;
    case 'youtubeEnded':
      deps.media.onYoutubeEnded();
      return;
    case 'youtubeTiming':
      deps.media.onYoutubeTiming(command.currentTime, command.duration);
      return;
    case 'youtubeDuration':
      deps.media.onYoutubeDuration(command.seconds);
      return;
    case 'soundcloudEnded':
      deps.media.onSoundcloudEnded();
      return;
    case 'soundcloudTiming':
      deps.media.onSoundcloudTiming(command.currentTime, command.duration);
      return;
    case 'soundcloudDuration':
      deps.media.onYoutubeDuration(command.seconds);
      return;
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}
