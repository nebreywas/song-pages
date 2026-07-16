import type { PlaybackDetourState } from '@shared/playback/detours/state';
import type { MediaSourceKind, PlaybackPhase, PlaybackSnapshot } from '@shared/playback';

export type BuildPlaybackSnapshotInput = {
  activeTrackId: number | null;
  isPlaying: boolean;
  waitingForHost: boolean;
  repeatMode: PlaybackSnapshot['repeatMode'];
  shuffle: boolean;
  currentTime: number;
  duration: number;
  detours: PlaybackDetourState;
  vcActive: boolean;
  playLockEnabled: boolean;
  playLockReleaseOnNext: boolean;
  showingYoutube: boolean;
  showingSoundcloud: boolean;
  showingFlow: boolean;
  usesDirectAudio: boolean;
};

function resolvePlaybackPhase(isPlaying: boolean, waitingForHost: boolean): PlaybackPhase {
  if (waitingForHost) return 'waiting-for-host';
  return isPlaying ? 'playing' : 'paused';
}

function resolveMediaSource(input: BuildPlaybackSnapshotInput): MediaSourceKind {
  if (input.showingYoutube) return 'youtube';
  if (input.showingSoundcloud) return 'soundcloud';
  if (input.showingFlow) return 'flow';
  if (input.activeTrackId == null) return null;
  return input.usesDirectAudio ? 'direct' : 'hls';
}

/** Immutable detour copy for snapshot consumers. */
export function snapshotDetourState(state: PlaybackDetourState): PlaybackDetourState {
  return {
    primary: state.primary
      ? {
          ...state.primary,
          consumedSongIds: [...state.primary.consumedSongIds],
        }
      : null,
    interrupt: state.interrupt ? { ...state.interrupt } : null,
    onDeck: state.onDeck ? { ...state.onDeck } : null,
    activeRole: state.activeRole,
  };
}

export function buildPlaybackSnapshot(input: BuildPlaybackSnapshotInput): PlaybackSnapshot {
  return {
    activeTrackId: input.activeTrackId,
    playbackPhase: resolvePlaybackPhase(input.isPlaying, input.waitingForHost),
    repeatMode: input.repeatMode,
    shuffle: input.shuffle,
    currentTime: input.currentTime,
    duration: input.duration,
    detours: snapshotDetourState(input.detours),
    vcActive: input.vcActive,
    playLockEnabled: input.playLockEnabled,
    playLockReleaseOnNext: input.playLockReleaseOnNext,
    mediaSource: resolveMediaSource(input),
  };
}
