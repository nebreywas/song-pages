import { useEffect, useRef, type RefObject } from 'react';

import type { ListenerPlaybackCommand } from '@shared/listener/playbackCommands';
import type { VcTransportCommand } from '@shared/vcMode/vcTransport';

import { getApp } from '../lib/bridge';
import {
  dispatchSetPlayLockReleaseOnNext,
  dispatchTogglePlayLock,
  dispatchTogglePlayLockReleaseOnNext,
  type PlayLockVcSync,
} from '../playback/adapters/playLockAdapter';
import { handleKeyboardPlaybackCommand } from '../playback/adapters/keyboardAdapter';
import { handleVcTransportCommand } from '../playback/adapters/vcTransportAdapter';
import type { PlaybackSession } from '../playback/types';

/** Rate limits for spammable seek-back commands (window ms → max hits). */
const SEEK_BACK_LIMITS: Record<string, { windowMs: number; max: number }> = {
  '-0.5': { windowMs: 2000, max: 10 },
  '-1': { windowMs: 3000, max: 8 },
  '-2': { windowMs: 4000, max: 3 },
  '-5': { windowMs: 5000, max: 2 },
};

function canSeekBack(deltaSeconds: number, history: number[]): boolean {
  const limit = SEEK_BACK_LIMITS[String(deltaSeconds)];
  if (!limit) return true;
  const now = Date.now();
  const recent = history.filter((stamp) => now - stamp < limit.windowMs);
  return recent.length < limit.max;
}

/** Replay the same slice every N ms so each hit is audible (not a fast buzz). */
const STUTTER_HIT_INTERVAL_MS = 400;

function runStutter(
  audio: HTMLAudioElement,
  durationMs: number,
  cancelActive: { current: (() => void) | null },
) {
  cancelActive.current?.();

  const anchor = audio.currentTime;
  const startedAt = performance.now();
  const wasPaused = audio.paused;

  if (wasPaused) void audio.play();

  const replayHit = () => {
    audio.currentTime = Math.max(0, anchor);
  };

  replayHit();

  const intervalId = window.setInterval(() => {
    if (performance.now() - startedAt >= durationMs) {
      finish();
      return;
    }
    replayHit();
  }, STUTTER_HIT_INTERVAL_MS);

  const timeoutId = window.setTimeout(finish, durationMs);

  function finish() {
    window.clearInterval(intervalId);
    window.clearTimeout(timeoutId);
    if (cancelActive.current === finish) cancelActive.current = null;
    if (wasPaused) audio.pause();
  }

  cancelActive.current = finish;
}

export type UsePlaybackTransportAdaptersOptions = {
  session: PlaybackSession;
  vcOpen: boolean;
  mainAudioRef: RefObject<HTMLAudioElement | null>;
  getSortedSongs: () => { id: number }[];
  playSongById: (songId: number) => void;
  onVisualizerStep?: (direction: 1 | -1) => void;
  onToggleLiveDebug?: () => void;
  playLockVc: PlayLockVcSync;
  media: {
    onYoutubeEnded: () => void;
    onSoundcloudEnded: () => void;
    onYoutubeDuration: (seconds: number) => void;
    onYoutubeTiming: (currentTime: number, duration: number) => void;
    onSoundcloudTiming: (currentTime: number, duration: number) => void;
  };
};

/**
 * Wire VC transport, keyboard commands, and play-lock IPC once at bootstrap.
 * Adapters call session.dispatch; ListenerMode executes effects.
 */
export function usePlaybackTransportAdapters({
  session,
  vcOpen,
  mainAudioRef,
  getSortedSongs,
  playSongById,
  onVisualizerStep,
  onToggleLiveDebug,
  playLockVc,
  media,
}: UsePlaybackTransportAdaptersOptions) {
  const seekBackHistoryRef = useRef<number[]>([]);
  const stutterCancelRef = useRef<(() => void) | null>(null);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const getSortedSongsRef = useRef(getSortedSongs);
  getSortedSongsRef.current = getSortedSongs;

  const playSongByIdRef = useRef(playSongById);
  playSongByIdRef.current = playSongById;

  const onVisualizerStepRef = useRef(onVisualizerStep);
  onVisualizerStepRef.current = onVisualizerStep;

  const onToggleLiveDebugRef = useRef(onToggleLiveDebug);
  onToggleLiveDebugRef.current = onToggleLiveDebug;

  const playLockVcRef = useRef(playLockVc);
  playLockVcRef.current = playLockVc;

  const mediaRef = useRef(media);
  mediaRef.current = media;

  useEffect(() => {
    const app = getApp();
    if (!app?.listener?.onPlaybackCommand) return;

    const off = app.listener.onPlaybackCommand((command: ListenerPlaybackCommand) => {
      const audio = mainAudioRef.current;
      handleKeyboardPlaybackCommand(command, {
        session: sessionRef.current,
        onVisualizerStep: (direction) => onVisualizerStepRef.current?.(direction),
        onToggleLiveDebug: () => onToggleLiveDebugRef.current?.(),
        media: {
          canSeekBack: (deltaSeconds) =>
            canSeekBack(deltaSeconds, seekBackHistoryRef.current),
          recordSeekBack: (deltaSeconds) => {
            seekBackHistoryRef.current.push(Date.now());
          },
          seekRelative: (deltaSeconds) => {
            if (!audio) return;
            audio.currentTime = Math.max(0, audio.currentTime + deltaSeconds);
          },
          stutter: (durationMs) => {
            if (!audio) return;
            runStutter(audio, durationMs, stutterCancelRef);
          },
        },
      });
    });

    return () => {
      stutterCancelRef.current?.();
      off();
    };
  }, [mainAudioRef]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc?.onTransport) return;

    const off = app.vc.onTransport((command: VcTransportCommand) => {
      handleVcTransportCommand(command, {
        session: sessionRef.current,
        getSortedSongs: () => getSortedSongsRef.current(),
        playSong: (songId) => playSongByIdRef.current(songId),
        media: mediaRef.current,
      });
    });

    return () => off();
  }, [vcOpen]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc) return;

    const vc = playLockVcRef.current;
    const offToggle = app.vc.onTogglePlayLock?.(() => {
      dispatchTogglePlayLock(sessionRef.current, vc);
    });
    const offToggleRelease = app.vc.onTogglePlayLockReleaseOnNext?.(() => {
      dispatchTogglePlayLockReleaseOnNext(sessionRef.current, vc);
    });
    const offSetRelease = app.vc.onSetPlayLockReleaseOnNext?.((enabled) => {
      dispatchSetPlayLockReleaseOnNext(sessionRef.current, vc, enabled);
    });

    return () => {
      offToggle?.();
      offToggleRelease?.();
      offSetRelease?.();
    };
  }, [vcOpen]);
}
