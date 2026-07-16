import type { PlaybackSnapshot } from '@shared/playback';
import type { CommandRuntimeContext } from '@shared/commands/runtimeContext';

import { buildVcQueueProjection, type VcQueueSong } from './buildVcQueueProjection';

export type CommandRuntimeLibraryContext = {
  sortedSongs: VcQueueSong[];
  queueAnchorSongId: number | null;
  sessionSkippedIds?: ReadonlySet<number>;
  hasCurrentSong: boolean;
  hasCoverArt: boolean;
  hasHostGraphic: boolean;
  upcomingMax?: number;
};

/** Command availability flags from session snapshot + library resolver inputs. */
export function buildCommandRuntimeContextFromSnapshot(
  snapshot: PlaybackSnapshot | null,
  library: CommandRuntimeLibraryContext,
  options: { vcModeActive: boolean },
): CommandRuntimeContext {
  if (!snapshot) {
    return { vcModeActive: options.vcModeActive };
  }

  const { nextSong, upcoming } = buildVcQueueProjection({
    snapshot,
    sortedSongs: library.sortedSongs,
    queueAnchorSongId: library.queueAnchorSongId,
    sessionSkippedIds: library.sessionSkippedIds,
    upcomingMax: library.upcomingMax ?? 5,
  });

  return {
    vcModeActive: options.vcModeActive,
    hasNextSong: nextSong != null,
    hasUpcomingSongs: upcoming.length > 0,
    hasCurrentSong: library.hasCurrentSong,
    hasCoverArt: library.hasCoverArt,
    hasHostGraphic: library.hasHostGraphic,
    hasPlaybackTiming: snapshot.duration > 0,
    specialPlayPauseActive: snapshot.playbackPhase === 'waiting-for-host',
    playLockActive: snapshot.vcActive && snapshot.playLockEnabled,
  };
}
