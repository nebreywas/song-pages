import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  loadYoutubeIframeApi,
  patchYoutubeIframePermissions,
  type YoutubePlayerInstance,
} from './loadYoutubeIframeApi';

export type YoutubePlayerHandle = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type YoutubePlayerProps = {
  videoId: string;
  playbackGeneration: number;
  shouldPlay: boolean;
  onReady?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onEnded?: () => void;
  onDuration?: (seconds: number) => void;
  onError?: (message: string) => void;
};

/**
 * Embedded YouTube player for custom-playlist experiment tracks.
 * Video stays visible so ads and YT Premium behavior work as on youtube.com.
 *
 * The YT IFrame API mutates its mount node directly. React must not own that
 * subtree — we append a manual mount div inside an empty shell so teardown
 * never races React's removeChild pass.
 */
export const YoutubePlayer = forwardRef<YoutubePlayerHandle, YoutubePlayerProps>(function YoutubePlayer(
  {
    videoId,
    playbackGeneration,
    shouldPlay,
    onReady,
    onPlayingChange,
    onEnded,
    onDuration,
    onError,
  },
  ref,
) {
  const shellRef = useRef<HTMLDivElement>(null);
  /** YT-owned mount — created/destroyed in effects, not rendered by React. */
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YoutubePlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  /** Block spurious PAUSED events while destroy() tears down the iframe. */
  const suppressEventsRef = useRef(false);
  const generationRef = useRef(playbackGeneration);
  const shouldPlayRef = useRef(shouldPlay);
  const onReadyRef = useRef(onReady);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onEndedRef = useRef(onEnded);
  const onDurationRef = useRef(onDuration);
  const onErrorRef = useRef(onError);

  generationRef.current = playbackGeneration;
  shouldPlayRef.current = shouldPlay;
  onReadyRef.current = onReady;
  onPlayingChangeRef.current = onPlayingChange;
  onEndedRef.current = onEnded;
  onDurationRef.current = onDuration;
  onErrorRef.current = onError;

  const readPlayerMethod = <T,>(
    method: keyof YoutubePlayerInstance,
    fallback: T,
  ): T => {
    const player = playerRef.current;
    if (!playerReady || !player) return fallback;
    const fn = player[method];
    if (typeof fn !== 'function') return fallback;
    return (fn as () => T).call(player);
  };

  useImperativeHandle(ref, () => ({
    play: () => readPlayerMethod('playVideo', undefined),
    pause: () => readPlayerMethod('pauseVideo', undefined),
    seek: (seconds: number) => {
      const player = playerRef.current;
      if (!playerReady || !player || typeof player.seekTo !== 'function') return;
      player.seekTo(seconds, true);
    },
    getCurrentTime: () => readPlayerMethod('getCurrentTime', 0),
    getDuration: () => readPlayerMethod('getDuration', 0),
  }));

  const releasePlayer = () => {
    suppressEventsRef.current = true;
    setPlayerReady(false);
    const player = playerRef.current;
    if (player && typeof player.destroy === 'function') {
      try {
        player.destroy();
      } catch {
        // YT may already have removed the iframe during a fast unmount.
      }
    }
    playerRef.current = null;

    const mount = mountRef.current;
    const shell = shellRef.current;
    if (mount && shell && mount.parentElement === shell) {
      shell.removeChild(mount);
    }
    mountRef.current = null;
  };

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !videoId) return;

    let cancelled = false;
    const generation = playbackGeneration;

    releasePlayer();

    const mount = document.createElement('div');
    mount.className = 'youtube-player-mount';
    shell.appendChild(mount);
    mountRef.current = mount;
    suppressEventsRef.current = false;

    void loadYoutubeIframeApi().then(() => {
      if (cancelled || generation !== generationRef.current) return;
      if (!mountRef.current || mountRef.current !== mount) return;

      new window.YT!.Player(mount, {
        videoId,
        playerVars: {
          autoplay: shouldPlayRef.current ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (generation !== generationRef.current) return;
            playerRef.current = event.target;
            setPlayerReady(true);
            patchYoutubeIframePermissions(event.target);
            const duration = event.target.getDuration();
            if (duration > 0) onDurationRef.current?.(duration);
            onReadyRef.current?.();
            if (shouldPlayRef.current) {
              event.target.playVideo();
              // Fallback when the first playVideo call races embed initialization.
              window.setTimeout(() => {
                if (generation !== generationRef.current || !shouldPlayRef.current) return;
                event.target.playVideo();
              }, 0);
            }
          },
          onStateChange: (event) => {
            if (generation !== generationRef.current || suppressEventsRef.current) return;
            const state = event.data;
            if (state === window.YT!.PlayerState.PLAYING) {
              onPlayingChangeRef.current?.(true);
              const duration = event.target.getDuration();
              if (duration > 0) onDurationRef.current?.(duration);
            }
            if (state === window.YT!.PlayerState.PAUSED) {
              onPlayingChangeRef.current?.(false);
            }
            if (state === window.YT!.PlayerState.ENDED) {
              onPlayingChangeRef.current?.(false);
              onEndedRef.current?.();
            }
          },
          onError: () => {
            if (generation !== generationRef.current) return;
            onErrorRef.current?.('YouTube playback failed for this video.');
          },
        },
      });
    });

    return () => {
      cancelled = true;
      releasePlayer();
    };
  }, [playbackGeneration, videoId]);

  // Run player teardown before React commits DOM deletion for the shell.
  useLayoutEffect(() => () => {
    releasePlayer();
  }, []);

  useEffect(() => {
    if (!playerReady) return;
    const player = playerRef.current;
    if (!player) return;
    if (shouldPlay) {
      if (typeof player.playVideo === 'function') player.playVideo();
    } else if (typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }
  }, [playerReady, shouldPlay]);

  return <div className="youtube-player-shell" ref={shellRef} />;
});
