export type PlaybackRole = 'primary' | 'play-now' | 'on-deck';

export type RepeatMode = 'off' | 'one' | 'all';

/** Primary playlist cursor — survives temporary detours. */
export type PrimaryPlaybackContext = {
  artistId: number;
  /** Playlist position anchor for post-detour advance (usually the interrupted primary track). */
  anchorSongId: number;
  /** Same-playlist On Deck tracks already played this traversal. */
  consumedSongIds: number[];
};

export type OnDeckTrack = {
  songId: number;
  artistId: number;
  songTitle: string;
  playlistName: string;
};

export type InterruptPlaybackContext = {
  returnSongId: number;
  returnArtistId: number;
  returnPositionSeconds: number;
};

export type PlaybackDetourState = {
  primary: PrimaryPlaybackContext | null;
  interrupt: InterruptPlaybackContext | null;
  onDeck: OnDeckTrack | null;
  activeRole: PlaybackRole;
};

export type TrackEndAdvanceAction =
  | { type: 'repeat-current' }
  | { type: 'play-on-deck'; songId: number }
  | { type: 'resume-interrupt' }
  | { type: 'repeat-primary-anchor'; songId: number }
  | { type: 'advance-primary'; anchorSongId: number; consumedSongIds: number[] }
  | { type: 'stop' };

export function createEmptyDetourState(): PlaybackDetourState {
  return {
    primary: null,
    interrupt: null,
    onDeck: null,
    activeRole: 'primary',
  };
}

export function clearDetourState(state: PlaybackDetourState): void {
  state.primary = null;
  state.interrupt = null;
  state.onDeck = null;
  state.activeRole = 'primary';
}

export function setPrimaryContext(
  state: PlaybackDetourState,
  artistId: number,
  anchorSongId: number,
): void {
  state.primary = {
    artistId,
    anchorSongId,
    consumedSongIds: [],
  };
  state.interrupt = null;
  state.onDeck = null;
  state.activeRole = 'primary';
}

export function markSongConsumed(state: PlaybackDetourState, songId: number): void {
  if (!state.primary) return;
  if (state.primary.consumedSongIds.includes(songId)) return;
  state.primary.consumedSongIds = [...state.primary.consumedSongIds, songId];
}

export function resolveTrackEndAdvance(input: {
  state: PlaybackDetourState;
  repeatMode: RepeatMode;
  currentSongId: number;
}): TrackEndAdvanceAction {
  const { state, repeatMode, currentSongId } = input;

  if (state.activeRole === 'play-now') {
    return state.interrupt ? { type: 'resume-interrupt' } : { type: 'stop' };
  }

  if (state.activeRole === 'on-deck') {
    if (!state.primary) return { type: 'stop' };
    if (repeatMode === 'one') {
      return { type: 'repeat-primary-anchor', songId: state.primary.anchorSongId };
    }
    return {
      type: 'advance-primary',
      anchorSongId: state.primary.anchorSongId,
      consumedSongIds: state.primary.consumedSongIds,
    };
  }

  // Primary role — current track is part of the primary playlist traversal.
  if (repeatMode === 'one') {
    if (state.onDeck) {
      return { type: 'play-on-deck', songId: state.onDeck.songId };
    }
    return { type: 'repeat-current' };
  }

  if (state.onDeck) {
    return { type: 'play-on-deck', songId: state.onDeck.songId };
  }

  if (!state.primary) {
    return { type: 'stop' };
  }

  return {
    type: 'advance-primary',
    anchorSongId: currentSongId,
    consumedSongIds: state.primary.consumedSongIds,
  };
}

export function skipSongIdsForPrimaryAdvance(consumedSongIds: readonly number[]): ReadonlySet<number> {
  return new Set(consumedSongIds);
}
