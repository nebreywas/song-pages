import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { soundcloudWidgetUrl } from '@shared/soundcloud/soundcloudFeature';

import {
  loadSoundcloudWidgetApi,
  soundcloudWidgetEvents,
  type SoundcloudWidgetInstance,
} from './loadSoundcloudWidgetApi';

export type SoundcloudPlayerHandle = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type SoundcloudPlayerProps = {
  permalink: string;
  playbackGeneration: number;
  shouldPlay: boolean;
  /** When true, use SoundCloud's waveform visual (VC visualizer slot). */
  visual?: boolean;
  onReady?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onEnded?: () => void;
  onDuration?: (seconds: number) => void;
  onError?: (message: string) => void;
};

/**
 * Embedded SoundCloud player for custom-playlist tracks.
 * Uses the official Widget API so Song Pages transport can call play/pause/seek.
 */
export const SoundcloudPlayer = forwardRef<SoundcloudPlayerHandle, SoundcloudPlayerProps>(
  function SoundcloudPlayer(
    {
      permalink,
      playbackGeneration,
      shouldPlay,
      visual = false,
      onReady,
      onPlayingChange,
      onEnded,
      onDuration,
      onError,
    },
    ref,
  ) {
    const shellRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const widgetRef = useRef<SoundcloudWidgetInstance | null>(null);
    const [widgetReady, setWidgetReady] = useState(false);
    const suppressEventsRef = useRef(false);
    const generationRef = useRef(playbackGeneration);
    const shouldPlayRef = useRef(shouldPlay);
    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);
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

    useImperativeHandle(ref, () => ({
      play: () => widgetRef.current?.play(),
      pause: () => widgetRef.current?.pause(),
      seek: (seconds: number) => {
        const widget = widgetRef.current;
        if (!widget) return;
        widget.seekTo(Math.max(0, seconds) * 1000);
        currentTimeRef.current = Math.max(0, seconds);
      },
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => durationRef.current,
    }));

    const releaseWidget = () => {
      suppressEventsRef.current = true;
      setWidgetReady(false);
      widgetRef.current = null;

      const iframe = iframeRef.current;
      const shell = shellRef.current;
      if (iframe && shell && iframe.parentElement === shell) {
        shell.removeChild(iframe);
      }
      iframeRef.current = null;
    };

    useEffect(() => {
      const shell = shellRef.current;
      if (!shell || !permalink) return;

      let cancelled = false;
      const generation = playbackGeneration;

      releaseWidget();

      const iframe = document.createElement('iframe');
      iframe.className = 'soundcloud-player-iframe';
      iframe.src = soundcloudWidgetUrl(permalink, { visual });
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('title', 'SoundCloud player');
      shell.appendChild(iframe);
      iframeRef.current = iframe;
      suppressEventsRef.current = false;
      currentTimeRef.current = 0;
      durationRef.current = 0;

      void loadSoundcloudWidgetApi()
        .then(() => {
          if (cancelled || generation !== generationRef.current) return;
          if (!iframeRef.current || iframeRef.current !== iframe) return;

          const widget = window.SC!.Widget(iframe);
          widgetRef.current = widget;
          const events = soundcloudWidgetEvents();

          widget.bind(events.READY, () => {
            if (generation !== generationRef.current || suppressEventsRef.current) return;
            setWidgetReady(true);
            widget.getDuration((durationMs) => {
              const seconds = durationMs / 1000;
              if (seconds > 0) {
                durationRef.current = seconds;
                onDurationRef.current?.(seconds);
              }
            });
            onReadyRef.current?.();
            if (shouldPlayRef.current) {
              widget.play();
              window.setTimeout(() => {
                if (generation !== generationRef.current || !shouldPlayRef.current) return;
                widget.play();
              }, 0);
            }
          });

          widget.bind(events.PLAY, () => {
            if (generation !== generationRef.current || suppressEventsRef.current) return;
            onPlayingChangeRef.current?.(true);
          });

          widget.bind(events.PAUSE, () => {
            if (generation !== generationRef.current || suppressEventsRef.current) return;
            onPlayingChangeRef.current?.(false);
          });

          widget.bind(events.PLAY_PROGRESS, (payload) => {
            if (generation !== generationRef.current || suppressEventsRef.current) return;
            const positionMs = payload?.currentPosition ?? 0;
            currentTimeRef.current = positionMs / 1000;
            widget.getDuration((durationMs) => {
              const seconds = durationMs / 1000;
              if (seconds > 0) {
                durationRef.current = seconds;
                onDurationRef.current?.(seconds);
              }
            });
          });

          widget.bind(events.FINISH, () => {
            if (generation !== generationRef.current || suppressEventsRef.current) return;
            onPlayingChangeRef.current?.(false);
            onEndedRef.current?.();
          });

          widget.bind(events.ERROR, () => {
            if (generation !== generationRef.current) return;
            onErrorRef.current?.('SoundCloud playback failed for this track.');
          });
        })
        .catch(() => {
          if (generation !== generationRef.current) return;
          onErrorRef.current?.('SoundCloud player could not be loaded.');
        });

      return () => {
        cancelled = true;
        releaseWidget();
      };
    }, [playbackGeneration, permalink, visual]);

    useLayoutEffect(() => () => {
      releaseWidget();
    }, []);

    useEffect(() => {
      if (!widgetReady) return;
      const widget = widgetRef.current;
      if (!widget) return;
      if (shouldPlay) widget.play();
      else widget.pause();
    }, [widgetReady, shouldPlay]);

    return <div className="soundcloud-player-shell" ref={shellRef} />;
  },
);
