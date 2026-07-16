/**
 * RAF-driven lyric effect tick for VC lyric views.
 * Keeps effect modules pure; this hook owns mutable module state + re-render cadence.
 */

import { useEffect, useRef, useState } from 'react';

import {
  EMPTY_LYRIC_EFFECT_TICK,
  getLyricEffect,
  type LyricEffectFrameInput,
  type LyricEffectId,
  type LyricEffectTickResult,
  type LyricEffectVisibleLine,
} from '@shared/lyricEffects';

type UseLyricEffectFrameArgs = {
  effectId: LyricEffectId;
  frequencyData: Uint8Array | null | undefined;
  isPlaying: boolean;
  currentTimeSec: number;
  lines: LyricEffectVisibleLine[];
  visibleRadius: number;
  /** When false, skip work (e.g. effect is none). */
  enabled?: boolean;
  /** Remount effect state when the song/lyrics corpus changes. */
  resetKey?: string | null;
};

/**
 * Sample FFT + visible lines each animation frame and publish presentation ticks.
 * Intentionally capped to ~24Hz React updates so ALARE scroll stays smooth (Pretty + pulses).
 */
export function useLyricEffectFrame({
  effectId,
  frequencyData,
  isPlaying,
  currentTimeSec,
  lines,
  visibleRadius,
  enabled = true,
  resetKey = null,
}: UseLyricEffectFrameArgs): LyricEffectTickResult {
  const [tick, setTick] = useState<LyricEffectTickResult>(EMPTY_LYRIC_EFFECT_TICK);
  const stateRef = useRef<unknown>(null);
  const effectIdRef = useRef(effectId);
  const resetKeyRef = useRef(resetKey);
  const inputRef = useRef({
    frequencyData: frequencyData ?? null,
    isPlaying,
    currentTimeSec,
    lines,
    visibleRadius,
  });
  const lastPublishMsRef = useRef(0);
  const lastHadFxRef = useRef(false);

  inputRef.current = {
    frequencyData: frequencyData ?? null,
    isPlaying,
    currentTimeSec,
    lines,
    visibleRadius,
  };

  // Reset module state whenever the selected effect or song corpus changes.
  if (effectIdRef.current !== effectId || resetKeyRef.current !== resetKey) {
    effectIdRef.current = effectId;
    resetKeyRef.current = resetKey;
    stateRef.current = null;
    lastHadFxRef.current = false;
  }

  useEffect(() => {
    if (!enabled || effectId === 'none') {
      setTick(EMPTY_LYRIC_EFFECT_TICK);
      stateRef.current = null;
      lastHadFxRef.current = false;
      return;
    }

    const mod = getLyricEffect(effectId);
    if (stateRef.current == null) stateRef.current = mod.createState();

    let raf = 0;
    const loop = (nowMs: number) => {
      const snap = inputRef.current;
      const frame: LyricEffectFrameInput = {
        nowMs,
        currentTimeSec: snap.currentTimeSec,
        isPlaying: snap.isPlaying,
        frequencyData: snap.frequencyData,
        lines: snap.lines,
        visibleRadius: snap.visibleRadius,
      };
      const result = mod.tick(frame, stateRef.current);
      const hasFx =
        Object.keys(result.lines).length > 0 ||
        Boolean(result.block.transform) ||
        result.block.letterSpacingEm != null ||
        Boolean(result.block.filter);

      // ~24Hz UI publish — skip empty→empty so Pretty scroll isn't fighting setState.
      if (nowMs - lastPublishMsRef.current >= 42) {
        lastPublishMsRef.current = nowMs;
        if (hasFx || lastHadFxRef.current) {
          lastHadFxRef.current = hasFx;
          setTick(hasFx ? result : EMPTY_LYRIC_EFFECT_TICK);
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [effectId, enabled, resetKey]);

  return tick;
}
