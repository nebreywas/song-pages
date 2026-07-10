import { useEffect, useRef, type RefObject } from 'react';

import type { ListenerPlaybackCommand } from '@shared/listener/playbackCommands';

import { getApp } from '../lib/bridge';

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

type UseListenerPlaybackCommandsOptions = {
  mainAudioRef: RefObject<HTMLAudioElement | null>;
  onPlayNextSong?: () => void;
};

/** Handle DJ-style playback commands dispatched from VC hotkeys / controller. */
export function useListenerPlaybackCommands({
  mainAudioRef,
  onPlayNextSong,
}: UseListenerPlaybackCommandsOptions) {
  const seekBackHistoryRef = useRef<number[]>([]);
  const stutterCancelRef = useRef<(() => void) | null>(null);
  const onPlayNextSongRef = useRef(onPlayNextSong);
  onPlayNextSongRef.current = onPlayNextSong;

  useEffect(() => {
    const app = getApp();
    if (!app?.listener?.onPlaybackCommand) return;

    const off = app.listener.onPlaybackCommand((command: ListenerPlaybackCommand) => {
      const audio = mainAudioRef.current;
      if (!audio) return;

      if (command.type === 'seekRelative') {
        if (!canSeekBack(command.deltaSeconds, seekBackHistoryRef.current)) return;
        seekBackHistoryRef.current.push(Date.now());
        audio.currentTime = Math.max(0, audio.currentTime + command.deltaSeconds);
        return;
      }

      if (command.type === 'stutter') {
        runStutter(audio, command.durationMs, stutterCancelRef);
        return;
      }

      if (command.type === 'playNextSong') {
        onPlayNextSongRef.current?.();
      }
    });

    return () => {
      stutterCancelRef.current?.();
      off();
    };
  }, [mainAudioRef]);
}
