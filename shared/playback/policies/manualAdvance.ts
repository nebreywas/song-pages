import type { PlaybackDetourState, PlaybackRole } from '../detours/state';
import {
  isVcPlayLockBlocking,
  type PlayLockGateContext,
} from './playLock';
import {
  pickNextPlayableSongId,
  pickPreviousPlayableSongId,
  type PlaybackQueueOptions,
} from '../queue/planner';

type QueueSong = { id: number };

export type ManualNextAction =
  | { type: 'blocked' }
  | { type: 'detour-failure' }
  | { type: 'advance-primary'; anchorSongId: number; consumedSongIds: number[] }
  | { type: 'play-on-deck'; updateAnchorToSongId: number | null }
  | { type: 'play-queue-track'; songId: number; restartIfSameSong: boolean };

export type ManualPreviousAction =
  | { type: 'blocked' }
  | { type: 'restart-detour'; role: Extract<PlaybackRole, 'play-now' | 'on-deck'> }
  | { type: 'dismiss-on-deck-only' }
  | { type: 'play-queue-track'; songId: number; dismissOnDeckFirst: boolean };

export type ResolveManualNextInput = {
  playLockEnabled: boolean;
  playingSongId: number | null;
  playingSongIdRef: number | null;
  state: PlaybackDetourState;
  queueAnchorSongId: number | null;
  sortedSongs: QueueSong[];
  queueOptions: PlaybackQueueOptions;
};

export type ResolveManualPreviousInput = {
  playLockEnabled: boolean;
  playingSongId: number | null;
  state: PlaybackDetourState;
  queueAnchorSongId: number | null;
  sortedSongs: QueueSong[];
  sessionSkippedIds?: ReadonlySet<number>;
  repeatMode: PlaybackQueueOptions['repeatMode'];
};

function playLockContext(playingSongId: number | null): PlayLockGateContext {
  return { playingSongId };
}

/** Pure policy for manual Next — ListenerMode executes the returned action. */
export function resolveManualNext(input: ResolveManualNextInput): ManualNextAction {
  if (isVcPlayLockBlocking(input.playLockEnabled, 'next', playLockContext(input.playingSongId))) {
    return { type: 'blocked' };
  }

  const { state } = input;
  const role = state.activeRole;

  if (role === 'play-now') {
    return { type: 'detour-failure' };
  }

  if (role === 'on-deck') {
    const primary = state.primary;
    if (!primary) return { type: 'blocked' };
    return {
      type: 'advance-primary',
      anchorSongId: primary.anchorSongId,
      consumedSongIds: primary.consumedSongIds,
    };
  }

  if (role === 'primary' && state.onDeck) {
    return {
      type: 'play-on-deck',
      updateAnchorToSongId: input.playingSongId,
    };
  }

  const primary = state.primary;
  if (role === 'primary' && primary) {
    const anchorId = input.playingSongIdRef ?? primary.anchorSongId;
    return {
      type: 'advance-primary',
      anchorSongId: anchorId,
      consumedSongIds: [],
    };
  }

  if (input.queueAnchorSongId == null) return { type: 'blocked' };

  const nextSongId = pickNextPlayableSongId(
    input.sortedSongs,
    input.queueAnchorSongId,
    input.queueOptions,
  );
  if (nextSongId == null) return { type: 'blocked' };

  return {
    type: 'play-queue-track',
    songId: nextSongId,
    restartIfSameSong: nextSongId === input.playingSongId,
  };
}

/** Pure policy for manual Previous — ListenerMode executes the returned action. */
export function resolveManualPrevious(input: ResolveManualPreviousInput): ManualPreviousAction {
  if (isVcPlayLockBlocking(input.playLockEnabled, 'prev', playLockContext(input.playingSongId))) {
    return { type: 'blocked' };
  }

  const role = input.state.activeRole;
  if (role === 'play-now' || role === 'on-deck') {
    return { type: 'restart-detour', role };
  }

  const dismissOnDeckFirst = role === 'primary' && input.state.onDeck != null;
  if (input.queueAnchorSongId == null) {
    return dismissOnDeckFirst ? { type: 'dismiss-on-deck-only' } : { type: 'blocked' };
  }

  const previousSongId = pickPreviousPlayableSongId(input.sortedSongs, input.queueAnchorSongId, {
    sessionSkippedIds: input.sessionSkippedIds,
    repeatMode: input.repeatMode,
  });
  if (previousSongId == null) {
    return dismissOnDeckFirst ? { type: 'dismiss-on-deck-only' } : { type: 'blocked' };
  }

  return {
    type: 'play-queue-track',
    songId: previousSongId,
    dismissOnDeckFirst,
  };
}
