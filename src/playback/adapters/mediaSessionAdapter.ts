/**
 * Web Media Session bridge — lets OS / keyboard / headphone media keys
 * (previous, play-pause, next) drive PlaybackSession like other software players.
 */

import type { PlaybackSession } from '../types';

export type MediaSessionTrackMeta = {
  title: string;
  artist: string;
  artworkUrl?: string | null;
};

const MEDIA_ACTIONS = [
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
] as const;

export type MediaSessionAction = (typeof MEDIA_ACTIONS)[number];

export function isMediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

/** Build MediaMetadata from the playing song row. */
export function buildMediaSessionMetadata(meta: MediaSessionTrackMeta | null): MediaMetadata | null {
  if (typeof MediaMetadata === 'undefined') return null;
  if (!meta?.title.trim()) return null;

  const artworkUrl = meta.artworkUrl?.trim() || '';
  return new MediaMetadata({
    title: meta.title.trim(),
    artist: meta.artist.trim() || 'Song Pages',
    album: 'Song Pages',
    artwork: artworkUrl
      ? [
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        ]
      : [],
  });
}

export function applyMediaSessionMetadata(meta: MediaSessionTrackMeta | null): void {
  if (!isMediaSessionSupported()) return;
  navigator.mediaSession.metadata = buildMediaSessionMetadata(meta);
}

export function applyMediaSessionPlaybackState(isPlaying: boolean): void {
  if (!isMediaSessionSupported()) return;
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

type MediaSessionHandlers = {
  session: PlaybackSession;
  /** Live playing flag — play/pause handlers must not blindly toggle. */
  getIsPlaying: () => boolean;
};

/** Register OS media-key handlers → PlaybackSession (`source: 'system'`). */
export function installMediaSessionHandlers({ session, getIsPlaying }: MediaSessionHandlers): () => void {
  if (!isMediaSessionSupported()) return () => {};

  const onPlay = () => {
    if (!getIsPlaying()) {
      session.dispatch({ type: 'TOGGLE_PLAY_PAUSE', source: 'system' });
    }
  };
  const onPause = () => {
    if (getIsPlaying()) {
      session.dispatch({ type: 'TOGGLE_PLAY_PAUSE', source: 'system' });
    }
  };
  const onPrevious = () => {
    session.dispatch({ type: 'PREVIOUS', source: 'system' });
  };
  const onNext = () => {
    session.dispatch({ type: 'NEXT', source: 'system' });
  };

  try {
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', onNext);
  } catch {
    /* Some Chromium builds reject individual actions */
  }

  return () => {
    for (const action of MEDIA_ACTIONS) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        /* ignore */
      }
    }
  };
}
