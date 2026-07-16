import type { PlaybackSnapshot } from '@shared/playback';
import type { VcPlaybackState, VcSpecialPlayPauseState } from '@shared/vcModeTypes';

import { buildVcQueueProjection, type VcQueueSong } from './buildVcQueueProjection';
import { projectSpecialPlayPauseForVc } from './projectSpecialPlayPause';

/** Playback-related slices of VcStatePayload — VC shell fields are merged in useVcModeManager. */
export type VcStateFromSnapshot = {
  playback: VcPlaybackState;
  nextSong: { title: string; artist: string } | null;
  upcoming: ReturnType<typeof buildVcQueueProjection>['upcoming'];
  specialPlayPause: VcSpecialPlayPauseState | null;
  playLockEnabled?: boolean;
  playLockReleaseOnNextSong?: boolean;
  activeTrackId: number | null;
};

export function buildVcPlaybackFromSnapshot(
  snapshot: PlaybackSnapshot,
): VcPlaybackState {
  return {
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    isPlaying: snapshot.playbackPhase === 'playing',
  };
}

export function buildVcStateFromSnapshot(input: {
  snapshot: PlaybackSnapshot;
  sortedSongs: VcQueueSong[];
  queueAnchorSongId: number | null;
  sessionSkippedIds?: ReadonlySet<number>;
  upcomingMax: number;
  specialPlayPauseCountdown: VcSpecialPlayPauseState | null;
}): VcStateFromSnapshot {
  const { snapshot, specialPlayPauseCountdown } = input;
  const { nextSong, upcoming } = buildVcQueueProjection(input);

  const playLock =
    snapshot.vcActive
      ? {
          playLockEnabled: snapshot.playLockEnabled,
          playLockReleaseOnNextSong: snapshot.playLockReleaseOnNext,
        }
      : {};

  return {
    playback: buildVcPlaybackFromSnapshot(snapshot),
    nextSong,
    upcoming,
    specialPlayPause: projectSpecialPlayPauseForVc(snapshot, specialPlayPauseCountdown),
    ...playLock,
    activeTrackId: snapshot.activeTrackId,
  };
}
