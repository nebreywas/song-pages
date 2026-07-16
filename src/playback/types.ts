import type { PlaybackCommand, PlaybackCommandResult, PlaybackEvent, PlaybackSnapshot } from '@shared/playback';
import type { isVcPlayLockBlocking } from '@shared/playback/policies/playLock';

export type PlaybackSnapshotListener = (snapshot: PlaybackSnapshot) => void;
export type PlaybackEventListener = (event: PlaybackEvent) => void;

/**
 * Framework-independent playback API. React hooks subscribe; they do not own lifetime.
 */
export type PlaybackSession = {
  dispatch(command: PlaybackCommand): PlaybackCommandResult;
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: PlaybackSnapshotListener): () => void;
  /** Phase 3+ — events drive history and diagnostics. No-op emitters in Phase 1 facade. */
  subscribeEvents(listener: PlaybackEventListener): () => void;
  /**
   * Bridge hook for Phase 1–2 while ListenerMode still owns React state.
   * Call when authoritative inputs change so subscribers refresh.
   */
  notifySnapshotChanged(): void;
  /** Play-lock and trajectory gates for adapters (Phase 4+). */
  isTrajectoryChangeBlocked(
    action: Parameters<typeof isVcPlayLockBlocking>[1],
    targetSongId?: number | null,
  ): boolean;
};

/** Imperative handlers supplied by ListenerMode until logic moves into PlaybackSessionImpl. */
export type PlaybackSessionHandlers = {
  togglePlayPause: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (time: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  playTrack?: (songId: number, options?: { userInitiated?: boolean; startAt?: number }) => void;
  playNow?: (songId: number) => void;
  queueOnDeck?: (songId: number) => void;
  dismissOnDeck?: () => void;
  resumeAfterWait?: () => void;
  volumeDelta?: (delta: number) => void;
  togglePlayLock?: () => void;
  setPlayLock?: (enabled: boolean) => void;
  setPlayLockRelease?: (enabled: boolean) => void;
  getSnapshot: () => PlaybackSnapshot;
};

export type PlaybackSessionFactory = (getHandlers: () => PlaybackSessionHandlers) => PlaybackSession;
