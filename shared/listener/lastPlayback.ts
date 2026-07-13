export const LISTENER_LAST_PLAYBACK_KEY = 'ui.listenerLastPlayback';

/** Last track the user was playing, scoped to the sidebar playlist it was queued from. */
export type ListenerLastPlaybackState = {
  artistId: number;
  songId: number;
};

export function buildLastPlaybackState(artistId: number, songId: number): ListenerLastPlaybackState {
  return {
    artistId: Math.trunc(artistId),
    songId: Math.trunc(songId),
  };
}

/** Normalize persisted last-playback settings from SQLite. */
export function normalizeListenerLastPlayback(raw: unknown): ListenerLastPlaybackState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<ListenerLastPlaybackState>;
  if (typeof value.artistId !== 'number' || !Number.isFinite(value.artistId)) return null;
  if (typeof value.songId !== 'number' || !Number.isFinite(value.songId)) return null;
  return buildLastPlaybackState(value.artistId, value.songId);
}
