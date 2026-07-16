/**
 * Framework-independent playback session — authoritative queue, detours, play lock, and phase.
 *
 * React and IPC adapters call `dispatch`; ListenerMode executes effects and media.
 *
 * @see documentation/playback-session-architecture.md
 * @see documentation/playback-refactor/00-locked-decisions.md
 */
import type { PlaybackCommand, PlaybackCommandResult, PlaybackEvent, PlaybackSnapshot } from '@shared/playback';
import { playbackCommandOk, playbackCommandRejected } from '@shared/playback';
import {
  clearDetourState,
  createEmptyDetourState,
  markSongConsumed,
  resolveTrackEndAdvance,
  setPrimaryContext,
  type PlaybackDetourState,
  type PlaybackRole,
  type RepeatMode,
} from '@shared/playback/detours/state';
import {
  isVcPlayLockBlocking,
  shouldReleasePlayLockOnNaturalAdvance,
  type NaturalTrackEndAction,
} from '@shared/playback/policies/playLock';
import { resolveManualNext, resolveManualPrevious } from '@shared/playback/policies/manualAdvance';
import { cycleRepeatMode } from '@shared/playback/policies/repeatShuffle';
import { snapshotDetourState } from './buildPlaybackSnapshot';
import type { PlaybackSessionEffect, PlaybackSessionEffectHandler } from './effects';
import type { MediaSourceKind, PlaybackPhase } from '@shared/playback/snapshot';
import type { PlaybackEventListener, PlaybackSession, PlaybackSnapshotListener } from './types';

export type PlaybackQueueContext = {
  queueAnchorSongId: number | null;
  sortedSongs: { id: number }[];
  sessionSkippedIds: ReadonlySet<number>;
};

export type PlaybackSessionImplDeps = {
  getQueueContext: () => PlaybackQueueContext;
  onEffects: PlaybackSessionEffectHandler;
};

export type SyncTransportInput = {
  activeTrackId: number | null;
  isPlaying: boolean;
  waitingForHost: boolean;
  currentTime: number;
  duration: number;
  mediaSource: MediaSourceKind;
  playingSongIdRef: number | null;
};

export type SyncVcPolicyInput = {
  vcActive: boolean;
  playLockEnabled: boolean;
  playLockReleaseOnNext: boolean;
};

/**
 * Authoritative playback session — owns detours, queue prefs, play lock, and phase.
 * Media load/play remains in ListenerMode via effect callbacks.
 */
export class PlaybackSessionImpl implements PlaybackSession {
  private readonly getQueueContext: () => PlaybackQueueContext;
  private readonly onEffects: PlaybackSessionEffectHandler;
  private readonly detourState: PlaybackDetourState = createEmptyDetourState();
  private readonly snapshotListeners = new Set<PlaybackSnapshotListener>();
  private readonly eventListeners = new Set<PlaybackEventListener>();

  private repeatMode: RepeatMode = 'off';
  private shuffle = false;
  private vcActive = false;
  private playLockEnabled = false;
  private playLockReleaseOnNext = false;
  private activeTrackId: number | null = null;
  private playbackPhase: PlaybackPhase = 'paused';
  private currentTime = 0;
  private duration = 0;
  private mediaSource: MediaSourceKind = null;
  private playingSongIdRef: number | null = null;

  constructor(deps: PlaybackSessionImplDeps) {
    this.getQueueContext = deps.getQueueContext;
    this.onEffects = deps.onEffects;
  }

  getDetourState(): PlaybackDetourState {
    return this.detourState;
  }

  isPlayLockActive(): boolean {
    return this.playLockEnabled;
  }

  /** Clear 1-song play lock immediately (VC manager updated separately). */
  applyPlayLockReleaseIfScheduled(): void {
    if (!this.playLockReleaseOnNext) return;
    this.playLockReleaseOnNext = false;
    this.playLockEnabled = false;
    this.notifySnapshotChanged();
  }

  syncTransport(input: SyncTransportInput): void {
    this.activeTrackId = input.activeTrackId;
    this.playingSongIdRef = input.playingSongIdRef;
    this.currentTime = input.currentTime;
    this.duration = input.duration;
    this.mediaSource = input.mediaSource;
    this.playbackPhase = input.waitingForHost
      ? 'waiting-for-host'
      : input.isPlaying
        ? 'playing'
        : 'paused';
    this.notifySnapshotChanged();
  }

  syncVcPolicy(input: SyncVcPolicyInput): void {
    this.vcActive = input.vcActive;
    this.playLockEnabled = input.vcActive && input.playLockEnabled;
    this.playLockReleaseOnNext = input.playLockReleaseOnNext;
    if (!input.vcActive) {
      this.playLockEnabled = false;
      this.playLockReleaseOnNext = false;
    }
    this.notifySnapshotChanged();
  }

  beginPrimaryPlayback(artistId: number, anchorSongId: number): void {
    clearDetourState(this.detourState);
    setPrimaryContext(this.detourState, artistId, anchorSongId);
    this.notifySnapshotChanged();
  }

  clearDetours(): void {
    clearDetourState(this.detourState);
    this.notifySnapshotChanged();
  }

  setPrimaryContext(artistId: number, anchorSongId: number): void {
    setPrimaryContext(this.detourState, artistId, anchorSongId);
    this.notifySnapshotChanged();
  }

  beginDetourOnDeckPlayback(songId: number): void {
    markSongConsumed(this.detourState, songId);
    this.detourState.onDeck = null;
    this.detourState.activeRole = 'on-deck';
    this.notifySnapshotChanged();
  }

  setDetourRole(role: PlaybackRole): void {
    this.detourState.activeRole = role;
    this.notifySnapshotChanged();
  }

  setOnDeck(track: PlaybackDetourState['onDeck']): void {
    this.detourState.onDeck = track;
    this.notifySnapshotChanged();
  }

  setInterrupt(interrupt: PlaybackDetourState['interrupt']): void {
    this.detourState.interrupt = interrupt;
    this.notifySnapshotChanged();
  }

  clearInterrupt(): void {
    this.detourState.interrupt = null;
    this.notifySnapshotChanged();
  }

  setActiveRole(role: PlaybackRole): void {
    this.detourState.activeRole = role;
    this.notifySnapshotChanged();
  }

  updatePrimaryAnchor(anchorSongId: number): void {
    if (this.detourState.primary) {
      this.detourState.primary.anchorSongId = anchorSongId;
      this.notifySnapshotChanged();
    }
  }

  applyManualNextMutation(action: Extract<ManualNextAction, { type: 'play-on-deck' }>): void {
    if (action.updateAnchorToSongId != null && this.detourState.primary) {
      this.detourState.primary.anchorSongId = action.updateAnchorToSongId;
      this.notifySnapshotChanged();
    }
  }

  handleTrackEnded(currentSongId: number, options?: { currentSongPlayable?: boolean }): void {
    const action = resolveTrackEndAdvance({
      state: this.detourState,
      repeatMode: this.repeatMode,
      currentSongId,
      currentSongPlayable: options?.currentSongPlayable,
    });
    this.onEffects([{ type: 'track-end', action }]);
    if (shouldReleasePlayLockOnNaturalAdvance(action.type as NaturalTrackEndAction)) {
      this.onEffects([{ type: 'release-play-lock-if-scheduled' }]);
    }
    this.notifySnapshotChanged();
  }

  dispatch(command: PlaybackCommand): PlaybackCommandResult {
    switch (command.type) {
      case 'TOGGLE_PLAY_PAUSE':
        this.onEffects([{ type: 'toggle-play-pause' }]);
        return playbackCommandOk();
      case 'PREVIOUS': {
        if (
          isVcPlayLockBlocking(this.playLockEnabled, 'prev', {
            playingSongId: this.activeTrackId,
          })
        ) {
          this.emitEvent({
            type: 'COMMAND_REJECTED',
            commandType: command.type,
            reason: 'play-lock',
          });
          return playbackCommandRejected('play-lock');
        }
        const action = resolveManualPrevious({
          playLockEnabled: false,
          playingSongId: this.activeTrackId,
          state: this.detourState,
          ...this.queueFields(),
        });
        if (action.type === 'blocked') {
          return playbackCommandOk();
        }
        this.onEffects([{ type: 'manual-previous', action }]);
        this.notifySnapshotChanged();
        return playbackCommandOk();
      }
      case 'NEXT': {
        if (this.playbackPhase === 'waiting-for-host') {
          this.emitEvent({
            type: 'COMMAND_REJECTED',
            commandType: command.type,
            reason: 'waiting-for-host',
          });
          return playbackCommandRejected('waiting-for-host');
        }
        if (
          isVcPlayLockBlocking(this.playLockEnabled, 'next', {
            playingSongId: this.activeTrackId,
          })
        ) {
          this.emitEvent({
            type: 'COMMAND_REJECTED',
            commandType: command.type,
            reason: 'play-lock',
          });
          return playbackCommandRejected('play-lock');
        }
        const action = resolveManualNext({
          playLockEnabled: false,
          playingSongId: this.activeTrackId,
          playingSongIdRef: this.playingSongIdRef,
          state: this.detourState,
          ...this.queueFields(),
          queueOptions: {
            shuffle: this.shuffle,
            repeatMode: this.repeatMode,
            sessionSkippedIds: this.getQueueContext().sessionSkippedIds,
          },
        });
        if (action.type === 'blocked') {
          return playbackCommandOk();
        }
        if (action.type === 'play-on-deck') {
          this.applyManualNextMutation(action);
        }
        this.onEffects([{ type: 'manual-next', action }]);
        this.notifySnapshotChanged();
        return playbackCommandOk();
      }
      case 'SEEK':
        this.onEffects([{ type: 'seek', time: command.time }]);
        return playbackCommandOk();
      case 'CYCLE_REPEAT':
        this.repeatMode = cycleRepeatMode(this.repeatMode);
        this.notifySnapshotChanged();
        return playbackCommandOk();
      case 'TOGGLE_SHUFFLE':
        this.shuffle = !this.shuffle;
        this.notifySnapshotChanged();
        return playbackCommandOk();
      case 'SET_PLAY_LOCK':
        if (this.vcActive) {
          this.playLockEnabled = command.enabled;
          this.notifySnapshotChanged();
        }
        return playbackCommandOk();
      case 'TOGGLE_PLAY_LOCK':
        if (this.vcActive) {
          this.playLockEnabled = !this.playLockEnabled;
          if (!this.playLockEnabled) {
            this.playLockReleaseOnNext = false;
          }
          this.notifySnapshotChanged();
        }
        return playbackCommandOk();
      case 'SET_PLAY_LOCK_RELEASE':
        if (this.vcActive) {
          this.playLockReleaseOnNext = command.enabled;
          if (command.enabled) {
            this.playLockEnabled = true;
          }
          this.notifySnapshotChanged();
        }
        return playbackCommandOk();
      case 'RESUME_AFTER_WAIT':
        if (this.playbackPhase !== 'waiting-for-host') {
          return playbackCommandRejected('not-waiting-for-host');
        }
        this.onEffects([{ type: 'resume-after-wait' }]);
        return playbackCommandOk();
      case 'VOLUME_DELTA':
        this.onEffects([{ type: 'volume-delta', delta: command.delta }]);
        return playbackCommandOk();
      default:
        return playbackCommandRejected('not-implemented');
    }
  }

  getSnapshot(): PlaybackSnapshot {
    return {
      activeTrackId: this.activeTrackId,
      playbackPhase: this.playbackPhase,
      repeatMode: this.repeatMode,
      shuffle: this.shuffle,
      currentTime: this.currentTime,
      duration: this.duration,
      detours: snapshotDetourState(this.detourState),
      vcActive: this.vcActive,
      playLockEnabled: this.playLockEnabled,
      playLockReleaseOnNext: this.playLockReleaseOnNext,
      mediaSource: this.mediaSource,
    };
  }

  subscribe(listener: PlaybackSnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  subscribeEvents(listener: PlaybackEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  notifySnapshotChanged(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }

  /** Check play lock for non-dispatch paths (e.g. playSong). */
  isTrajectoryChangeBlocked(
    action: Parameters<typeof isVcPlayLockBlocking>[1],
    targetSongId?: number | null,
  ): boolean {
    return isVcPlayLockBlocking(this.playLockEnabled, action, {
      playingSongId: this.activeTrackId,
      targetSongId,
    });
  }

  private queueFields() {
    const { queueAnchorSongId, sortedSongs, sessionSkippedIds } = this.getQueueContext();
    return { queueAnchorSongId, sortedSongs, sessionSkippedIds, repeatMode: this.repeatMode };
  }

  private emitEvent(event: PlaybackEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
