import type { ManualNextAction, ManualPreviousAction } from '@shared/playback/policies/manualAdvance';
import type { TrackEndAdvanceAction } from '@shared/playback/detours/state';
import type { PlaybackSessionEffect } from '../playback/effects';
import type { SongRow } from '../types/app';

export type PlaybackEffectRunnerDeps = {
  sortedSongs: SongRow[];
  playingSongId: number | null;
  playSong: (song: SongRow, options?: PlaySongOptions) => Promise<void>;
  advancePrimaryPlaylist: (anchorSongId: number, consumedSongIds: readonly number[]) => Promise<void>;
  handleDetourPlaybackFailure: () => Promise<void>;
  playQueuedOnDeckIfAny: (fromUser?: boolean) => Promise<boolean>;
  dismissOnDeck: () => void;
  togglePlayPause: () => void;
  handleSeek: (time: number) => void;
  executeTrackEndAction: (action: TrackEndAdvanceAction) => Promise<void>;
  releasePlayLockIfScheduled: () => void;
  resumeAfterWait: () => void;
  applyVolumeDelta: (delta: number) => void;
};

type PlaySongOptions = {
  startAt?: number;
  detour?: boolean;
  role?: 'primary' | 'play-now' | 'on-deck';
  userInitiated?: boolean;
};

function executeManualNext(action: ManualNextAction, deps: PlaybackEffectRunnerDeps): void {
  switch (action.type) {
    case 'blocked':
      return;
    case 'detour-failure':
      void deps.handleDetourPlaybackFailure();
      return;
    case 'advance-primary':
      void deps.advancePrimaryPlaylist(action.anchorSongId, action.consumedSongIds);
      return;
    case 'play-on-deck':
      void deps.playQueuedOnDeckIfAny(true);
      return;
    case 'play-queue-track': {
      const nextSong = deps.sortedSongs.find((song) => song.id === action.songId);
      if (nextSong) {
        void deps.playSong(nextSong, {
          userInitiated: true,
          startAt: action.restartIfSameSong ? 0 : undefined,
        });
      }
    }
  }
}

function executeManualPrevious(action: ManualPreviousAction, deps: PlaybackEffectRunnerDeps): void {
  switch (action.type) {
    case 'blocked':
      return;
    case 'restart-detour': {
      // Caller must supply current row via playSong closure — handled in ListenerMode wrapper
      return;
    }
    case 'dismiss-on-deck-only':
      deps.dismissOnDeck();
      return;
    case 'play-queue-track': {
      if (action.dismissOnDeckFirst) deps.dismissOnDeck();
      const previousSong = deps.sortedSongs.find((song) => song.id === action.songId);
      if (previousSong) void deps.playSong(previousSong);
    }
  }
}

export function runPlaybackSessionEffects(
  effects: PlaybackSessionEffect[],
  deps: PlaybackEffectRunnerDeps & {
    restartDetour?: (role: 'play-now' | 'on-deck') => void;
  },
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'manual-next':
        executeManualNext(effect.action, deps);
        break;
      case 'manual-previous':
        if (effect.action.type === 'restart-detour' && deps.restartDetour) {
          deps.restartDetour(effect.action.role);
        } else {
          executeManualPrevious(effect.action, deps);
        }
        break;
      case 'track-end':
        void deps.executeTrackEndAction(effect.action);
        break;
      case 'toggle-play-pause':
        deps.togglePlayPause();
        break;
      case 'seek':
        deps.handleSeek(effect.time);
        break;
      case 'release-play-lock-if-scheduled':
        deps.releasePlayLockIfScheduled();
        break;
      case 'resume-after-wait':
        deps.resumeAfterWait();
        break;
      case 'volume-delta':
        deps.applyVolumeDelta(effect.delta);
        break;
    }
  }
}
