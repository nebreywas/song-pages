/**
 * Keep `navigator.mediaSession` aligned with the Listener player's transport
 * so macOS/Windows media keys and Now Playing control Song Pages.
 */

import { useEffect, useRef } from 'react';

import {
  applyMediaSessionMetadata,
  applyMediaSessionPlaybackState,
  installMediaSessionHandlers,
  isMediaSessionSupported,
  type MediaSessionTrackMeta,
} from '../adapters/mediaSessionAdapter';
import type { PlaybackSession } from '../types';

/** YouTube/SoundCloud iframes clobber handlers — refresh while a widget owns audio. */
const WIDGET_MEDIA_SESSION_REASSERT_MS = 1500;

type UseMediaSessionOptions = {
  session: PlaybackSession;
  isPlaying: boolean;
  /** Current track identity — null clears metadata when nothing is loaded. */
  track: MediaSessionTrackMeta | null;
  enabled?: boolean;
  /**
   * When true (widget embed playing), periodically re-install handlers/metadata
   * because third-party iframes overwrite `navigator.mediaSession`.
   */
  reassertWhilePlaying?: boolean;
};

export function useMediaSession({
  session,
  isPlaying,
  track,
  enabled = true,
  reassertWhilePlaying = false,
}: UseMediaSessionOptions): void {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const trackRef = useRef(track);
  trackRef.current = track;

  const applyAll = () => {
    if (!isMediaSessionSupported()) return () => {};
    applyMediaSessionMetadata(trackRef.current);
    applyMediaSessionPlaybackState(isPlayingRef.current);
    return installMediaSessionHandlers({
      session,
      getIsPlaying: () => isPlayingRef.current,
    });
  };

  // Baseline install — also re-runs when the track identity changes.
  useEffect(() => {
    if (!enabled || !isMediaSessionSupported()) return;
    return applyAll();
  }, [enabled, session, track?.title, track?.artist, track?.artworkUrl]);

  useEffect(() => {
    if (!enabled || !isMediaSessionSupported()) return;
    applyMediaSessionMetadata(track);
  }, [enabled, track?.title, track?.artist, track?.artworkUrl]);

  useEffect(() => {
    if (!enabled || !isMediaSessionSupported()) return;
    applyMediaSessionPlaybackState(isPlaying);
  }, [enabled, isPlaying]);

  // Fight iframe Media Session ownership while YouTube/SoundCloud is the active player.
  useEffect(() => {
    if (!enabled || !reassertWhilePlaying || !isPlaying || !isMediaSessionSupported()) return;

    applyAll();
    const intervalId = window.setInterval(() => {
      applyAll();
    }, WIDGET_MEDIA_SESSION_REASSERT_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled, reassertWhilePlaying, isPlaying, session, track?.title]);
}
