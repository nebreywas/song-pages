import { useCallback, useEffect, useRef, useState } from 'react';

export type ZenInterludeState = {
  durationSeconds: number;
  elapsedSeconds: number;
  running: boolean;
};

type UseZenInterludeOptions = {
  /** Continue the deferred normal track-end advance exactly once. */
  onComplete: () => void;
};

/**
 * Runs a silent, seekable pseudo-track without touching the real audio element.
 *
 * Keeping this clock separate from ListenerMode's song duration/currentTime
 * prevents the fake interlude duration from being persisted as song metadata.
 */
export function useZenInterlude({ onComplete }: UseZenInterludeOptions) {
  const [interlude, setInterlude] = useState<ZenInterludeState | null>(null);
  const stateRef = useRef<ZenInterludeState | null>(null);
  const baseElapsedRef = useRef(0);
  const runningStartedAtRef = useRef(0);
  const completingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const commit = useCallback((next: ZenInterludeState | null) => {
    stateRef.current = next;
    setInterlude(next);
  }, []);

  const complete = useCallback(() => {
    if (completingRef.current || stateRef.current == null) return;
    completingRef.current = true;
    commit(null);
    onCompleteRef.current();
    completingRef.current = false;
  }, [commit]);

  useEffect(() => {
    if (!interlude?.running) return;

    const tick = () => {
      const current = stateRef.current;
      if (!current?.running) return;
      const elapsed = Math.min(
        current.durationSeconds,
        baseElapsedRef.current + (Date.now() - runningStartedAtRef.current) / 1000,
      );
      if (elapsed >= current.durationSeconds) {
        complete();
        return;
      }
      commit({ ...current, elapsedSeconds: elapsed });
    };

    tick();
    const intervalId = window.setInterval(tick, 100);
    return () => window.clearInterval(intervalId);
  }, [commit, complete, interlude?.running]);

  const begin = useCallback(
    (durationSeconds: number) => {
      const duration = Math.max(1, Math.round(durationSeconds));
      completingRef.current = false;
      baseElapsedRef.current = 0;
      runningStartedAtRef.current = Date.now();
      commit({ durationSeconds: duration, elapsedSeconds: 0, running: true });
    },
    [commit],
  );

  /** Clear without advancing; used when another playback action takes over. */
  const cancel = useCallback(() => {
    completingRef.current = false;
    commit(null);
  }, [commit]);

  /** Remove/skip the silence and continue to the already-deferred next track. */
  const removeAndContinue = useCallback(() => {
    complete();
  }, [complete]);

  const togglePlaying = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    if (current.running) {
      const elapsed = Math.min(
        current.durationSeconds,
        baseElapsedRef.current + (Date.now() - runningStartedAtRef.current) / 1000,
      );
      baseElapsedRef.current = elapsed;
      commit({ ...current, elapsedSeconds: elapsed, running: false });
      return;
    }

    baseElapsedRef.current = current.elapsedSeconds;
    runningStartedAtRef.current = Date.now();
    commit({ ...current, running: true });
  }, [commit]);

  const seek = useCallback(
    (seconds: number) => {
      const current = stateRef.current;
      if (!current) return;
      const elapsed = Math.min(current.durationSeconds, Math.max(0, seconds));
      if (elapsed >= current.durationSeconds) {
        complete();
        return;
      }
      baseElapsedRef.current = elapsed;
      runningStartedAtRef.current = Date.now();
      commit({ ...current, elapsedSeconds: elapsed });
    },
    [commit, complete],
  );

  return {
    interlude,
    begin,
    cancel,
    removeAndContinue,
    togglePlaying,
    seek,
  };
}
