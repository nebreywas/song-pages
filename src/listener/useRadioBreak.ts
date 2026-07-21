/**
 * Runs a multi-segment between-track break (silence + TTS) as a seekable
 * pseudo-track, without touching the real audio element.
 *
 * Used for Radio Mode alone and for Zen+Radio composites, where the
 * announcement is inserted directly between the two Zen silence halves.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { RadioBreakSegment } from '@shared/listener/radioMode';
import type { RadioVoiceProfile } from '@shared/listener/radioVoices';

import { speakRadioAnnouncement, stopRadioSpeech } from './speakRadioAnnouncement';

/** Placeholder duration for the speak segment until TTS finishes (seek bar). */
const SPEAK_DURATION_PLACEHOLDER_SECONDS = 12;

export type RadioBreakState = {
  /** Sum of known segment lengths (speak uses placeholder until done). */
  durationSeconds: number;
  elapsedSeconds: number;
  running: boolean;
  title: string;
  /** True while TTS is in flight. */
  speaking: boolean;
};

type UseRadioBreakOptions = {
  onComplete: () => void;
};

type InternalRun = {
  segments: RadioBreakSegment[];
  profile: RadioVoiceProfile;
  segmentIndex: number;
  /** Elapsed seconds credited to fully finished segments. */
  completedSeconds: number;
  segmentElapsed: number;
  running: boolean;
  speakController: AbortController | null;
  /** Actual speak duration once known (replaces placeholder). */
  speakActualSeconds: number | null;
};

function segmentPlannedDuration(segment: RadioBreakSegment, speakActual: number | null): number {
  if (segment.kind === 'silence') return segment.durationSeconds;
  return speakActual ?? SPEAK_DURATION_PLACEHOLDER_SECONDS;
}

function totalPlannedDuration(
  segments: RadioBreakSegment[],
  speakActual: number | null,
): number {
  return segments.reduce((sum, segment) => sum + segmentPlannedDuration(segment, speakActual), 0);
}

function toPublicState(run: InternalRun): RadioBreakState {
  const segment = run.segments[run.segmentIndex];
  return {
    durationSeconds: totalPlannedDuration(run.segments, run.speakActualSeconds),
    elapsedSeconds: run.completedSeconds + run.segmentElapsed,
    running: run.running,
    title: segment?.title ?? 'Radio Break',
    speaking: segment?.kind === 'speak',
  };
}

export function useRadioBreak({ onComplete }: UseRadioBreakOptions) {
  const [breakState, setBreakState] = useState<RadioBreakState | null>(null);
  const runRef = useRef<InternalRun | null>(null);
  const segmentStartedAtRef = useRef(0);
  const segmentBaseElapsedRef = useRef(0);
  const completingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const commitFromRun = useCallback(() => {
    const run = runRef.current;
    setBreakState(run ? toPublicState(run) : null);
  }, []);

  const finishBreak = useCallback(() => {
    if (completingRef.current || runRef.current == null) return;
    completingRef.current = true;
    stopRadioSpeech();
    runRef.current.speakController?.abort();
    runRef.current = null;
    setBreakState(null);
    onCompleteRef.current();
    completingRef.current = false;
  }, []);

  const advanceToSegment = useCallback(
    (index: number) => {
      const run = runRef.current;
      if (!run) return;

      if (index >= run.segments.length) {
        finishBreak();
        return;
      }

      run.segmentIndex = index;
      run.segmentElapsed = 0;
      segmentBaseElapsedRef.current = 0;
      segmentStartedAtRef.current = Date.now();

      const segment = run.segments[index];
      if (!segment) {
        finishBreak();
        return;
      }

      if (segment.kind === 'speak') {
        run.speakController?.abort();
        const controller = new AbortController();
        run.speakController = controller;
        const speakStarted = Date.now();
        commitFromRun();

        void speakRadioAnnouncement({
          profile: run.profile,
          text: segment.text,
          signal: controller.signal,
        })
          .then(() => {
            if (runRef.current !== run || run.segmentIndex !== index) return;
            const actual = Math.max(0.4, (Date.now() - speakStarted) / 1000);
            run.speakActualSeconds = actual;
            run.completedSeconds += actual;
            run.segmentElapsed = 0;
            advanceToSegment(index + 1);
          })
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('[radio] announcement failed', error);
            if (runRef.current !== run || run.segmentIndex !== index) return;
            // Skip a failed announcement rather than wedging the playlist.
            run.completedSeconds += run.segmentElapsed;
            run.segmentElapsed = 0;
            advanceToSegment(index + 1);
          });
        return;
      }

      commitFromRun();
    },
    [commitFromRun, finishBreak],
  );

  // Silence-segment clock.
  useEffect(() => {
    if (!breakState?.running || breakState.speaking) return;

    const tick = () => {
      const run = runRef.current;
      if (!run?.running) return;
      const segment = run.segments[run.segmentIndex];
      if (!segment || segment.kind !== 'silence') return;

      const elapsed = Math.min(
        segment.durationSeconds,
        segmentBaseElapsedRef.current + (Date.now() - segmentStartedAtRef.current) / 1000,
      );
      run.segmentElapsed = elapsed;
      if (elapsed >= segment.durationSeconds) {
        run.completedSeconds += segment.durationSeconds;
        run.segmentElapsed = 0;
        advanceToSegment(run.segmentIndex + 1);
        return;
      }
      commitFromRun();
    };

    tick();
    const intervalId = window.setInterval(tick, 100);
    return () => window.clearInterval(intervalId);
  }, [advanceToSegment, breakState?.running, breakState?.speaking, commitFromRun]);

  // Soft progress while speaking so the seek bar isn't frozen.
  useEffect(() => {
    if (!breakState?.running || !breakState.speaking) return;

    const tick = () => {
      const run = runRef.current;
      if (!run?.running) return;
      const segment = run.segments[run.segmentIndex];
      if (!segment || segment.kind !== 'speak') return;
      run.segmentElapsed = Math.min(
        SPEAK_DURATION_PLACEHOLDER_SECONDS,
        (Date.now() - segmentStartedAtRef.current) / 1000,
      );
      commitFromRun();
    };

    tick();
    const intervalId = window.setInterval(tick, 100);
    return () => window.clearInterval(intervalId);
  }, [breakState?.running, breakState?.speaking, commitFromRun]);

  const begin = useCallback(
    (segments: RadioBreakSegment[], profile: RadioVoiceProfile) => {
      if (segments.length === 0) {
        onCompleteRef.current();
        return;
      }
      stopRadioSpeech();
      completingRef.current = false;
      runRef.current = {
        segments,
        profile,
        segmentIndex: 0,
        completedSeconds: 0,
        segmentElapsed: 0,
        running: true,
        speakController: null,
        speakActualSeconds: null,
      };
      segmentBaseElapsedRef.current = 0;
      segmentStartedAtRef.current = Date.now();
      commitFromRun();
      advanceToSegment(0);
    },
    [advanceToSegment, commitFromRun],
  );

  const cancel = useCallback(() => {
    completingRef.current = false;
    stopRadioSpeech();
    runRef.current?.speakController?.abort();
    runRef.current = null;
    setBreakState(null);
  }, []);

  const removeAndContinue = useCallback(() => {
    finishBreak();
  }, [finishBreak]);

  const togglePlaying = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    const segment = run.segments[run.segmentIndex];

    if (run.running) {
      // Pausing mid-announcement stops TTS; resume restarts the line.
      if (segment?.kind === 'speak') {
        run.speakController?.abort();
        stopRadioSpeech();
      } else {
        segmentBaseElapsedRef.current = run.segmentElapsed;
      }
      run.running = false;
      commitFromRun();
      return;
    }

    run.running = true;
    segmentStartedAtRef.current = Date.now();
    if (segment?.kind === 'speak') {
      // Restart the announcement from the top on resume.
      advanceToSegment(run.segmentIndex);
      return;
    }
    commitFromRun();
  }, [advanceToSegment, commitFromRun]);

  const seek = useCallback(
    (seconds: number) => {
      const run = runRef.current;
      if (!run) return;
      // Seeking during TTS is awkward — skip the rest of the break.
      if (run.segments[run.segmentIndex]?.kind === 'speak') {
        finishBreak();
        return;
      }

      const target = Math.max(0, seconds);
      let remaining = target;
      let completed = 0;
      for (let i = 0; i < run.segments.length; i += 1) {
        const segment = run.segments[i];
        const planned = segmentPlannedDuration(segment, run.speakActualSeconds);
        if (remaining < planned || i === run.segments.length - 1) {
          // Land inside this segment (or finish).
          if (segment.kind === 'speak' || remaining >= planned) {
            finishBreak();
            return;
          }
          run.segmentIndex = i;
          run.completedSeconds = completed;
          run.segmentElapsed = remaining;
          segmentBaseElapsedRef.current = remaining;
          segmentStartedAtRef.current = Date.now();
          run.running = true;
          commitFromRun();
          return;
        }
        remaining -= planned;
        completed += planned;
      }
      finishBreak();
    },
    [commitFromRun, finishBreak],
  );

  return {
    breakState,
    begin,
    cancel,
    removeAndContinue,
    togglePlaying,
    seek,
  };
}
