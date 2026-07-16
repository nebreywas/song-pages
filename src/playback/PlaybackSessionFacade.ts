import type { PlaybackCommand } from '@shared/playback';
import { playbackCommandOk, playbackCommandRejected } from '@shared/playback';

import type {
  PlaybackEventListener,
  PlaybackSession,
  PlaybackSessionHandlers,
  PlaybackSnapshotListener,
} from './types';

/**
 * Phase 1 facade — forwards commands to ListenerMode handlers without owning policy.
 * Replaced incrementally by PlaybackSessionImpl (Phase 3).
 */
import type { isVcPlayLockBlocking } from '@shared/playback/policies/playLock';

export class PlaybackSessionFacade implements PlaybackSession {
  private readonly getHandlers: () => PlaybackSessionHandlers;
  private readonly snapshotListeners = new Set<PlaybackSnapshotListener>();
  private readonly eventListeners = new Set<PlaybackEventListener>();

  constructor(getHandlers: () => PlaybackSessionHandlers) {
    this.getHandlers = getHandlers;
  }

  dispatch(command: PlaybackCommand) {
    const handlers = this.getHandlers();

    switch (command.type) {
      case 'TOGGLE_PLAY_PAUSE':
        handlers.togglePlayPause();
        return playbackCommandOk();
      case 'PREVIOUS':
        handlers.playPrevious();
        return playbackCommandOk();
      case 'NEXT':
        handlers.playNext();
        return playbackCommandOk();
      case 'SEEK':
        handlers.seek(command.time);
        return playbackCommandOk();
      case 'CYCLE_REPEAT':
        handlers.cycleRepeat();
        return playbackCommandOk();
      case 'TOGGLE_SHUFFLE':
        handlers.toggleShuffle();
        return playbackCommandOk();
      case 'PLAY_TRACK':
        if (!handlers.playTrack) return playbackCommandRejected('not-implemented');
        handlers.playTrack(command.songId, {
          userInitiated: command.userInitiated,
          startAt: command.startAt,
        });
        return playbackCommandOk();
      case 'PLAY_NOW':
        if (!handlers.playNow) return playbackCommandRejected('not-implemented');
        handlers.playNow(command.songId);
        return playbackCommandOk();
      case 'QUEUE_ON_DECK':
        if (!handlers.queueOnDeck) return playbackCommandRejected('not-implemented');
        handlers.queueOnDeck(command.songId);
        return playbackCommandOk();
      case 'DISMISS_ON_DECK':
        if (!handlers.dismissOnDeck) return playbackCommandRejected('not-implemented');
        handlers.dismissOnDeck();
        return playbackCommandOk();
      case 'RESUME_AFTER_WAIT':
        if (!handlers.resumeAfterWait) return playbackCommandRejected('not-implemented');
        handlers.resumeAfterWait();
        return playbackCommandOk();
      case 'VOLUME_DELTA':
        if (!handlers.volumeDelta) return playbackCommandRejected('not-implemented');
        handlers.volumeDelta(command.delta);
        return playbackCommandOk();
      case 'TOGGLE_PLAY_LOCK':
        if (!handlers.togglePlayLock) return playbackCommandRejected('not-implemented');
        handlers.togglePlayLock();
        return playbackCommandOk();
      case 'SET_PLAY_LOCK':
        if (!handlers.setPlayLock) return playbackCommandRejected('not-implemented');
        handlers.setPlayLock(command.enabled);
        return playbackCommandOk();
      case 'SET_PLAY_LOCK_RELEASE':
        if (!handlers.setPlayLockRelease) return playbackCommandRejected('not-implemented');
        handlers.setPlayLockRelease(command.enabled);
        return playbackCommandOk();
      default: {
        const _exhaustive: never = command;
        return playbackCommandRejected('not-implemented');
      }
    }
  }

  getSnapshot() {
    return this.getHandlers().getSnapshot();
  }

  subscribe(listener: PlaybackSnapshotListener) {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  subscribeEvents(listener: PlaybackEventListener) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  notifySnapshotChanged() {
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }

  isTrajectoryChangeBlocked(
    _action: Parameters<typeof isVcPlayLockBlocking>[1],
    _targetSongId?: number | null,
  ): boolean {
    return false;
  }

  /** Reserved for Phase 3+ when session owns transitions. */
  protected emitEvent(_event: Parameters<PlaybackEventListener>[0]) {
    // Phase 1: no events emitted from facade.
  }
}
