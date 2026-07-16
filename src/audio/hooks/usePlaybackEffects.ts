import { useEffect } from 'react';

import { applyMainMirrorRouting } from '../AudioEffectsEngine';
import type { EffectsLabState } from '../effectsLab/types';
import {
  applyElementPlaybackRate,
  clampPlaybackRateHold,
  PLAYBACK_RATE_HOLD_DEFAULT,
} from '../effectsLab/playbackRate';
import { isPlaybackRateBurstActive } from '../effectsLab/performance/rateBurst';

type UsePlaybackEffectsOptions = {
  /** Audible player — ducked while FX run on the mirror element. Never gets Web Audio. */
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
  /** Hidden mirror — bass / lo-fi Web Audio runs here so main stays capturable. */
  analyserAudioRef: React.RefObject<HTMLAudioElement | null>;
  volume: number;
  isPlaying: boolean;
  bassBoost: boolean;
  lofi: boolean;
  /** Optional discovery lab — takes mirror path when enabled (legacy toggles win if both on). */
  effectsLab?: EffectsLabState;
  /**
   * VC Mode is open — main speakers stay silent; the VC window carries audible output.
   */
  vcMirrorPlaybackActive?: boolean;
  /** Dry performance FX path (filter sweeps, etc.) while no whole-song preset is active. */
  performanceFxActive?: boolean;
};

/** Bass boost / lo-fi / effects lab on the mirror element; main stays native for capture when FX off. */
export function usePlaybackEffects({
  mainAudioRef,
  analyserAudioRef,
  volume,
  isPlaying,
  bassBoost,
  lofi,
  effectsLab,
  vcMirrorPlaybackActive = false,
  performanceFxActive = false,
}: UsePlaybackEffectsOptions): void {
  useEffect(() => {
    const main = mainAudioRef.current;
    const mirror = analyserAudioRef.current;
    if (!main || !mirror) return;

    applyMainMirrorRouting({
      mainAudio: main,
      mirrorAudio: mirror,
      volume,
      isPlaying,
      bassBoost,
      lofi,
      effectsLab,
      vcMirrorPlaybackActive,
      performanceFxActive,
    });

    // Coupled rate hold on both elements so mirror drift correction stays peaceful.
    // Skip while a rate burst owns the transport.
    if (!isPlaybackRateBurstActive()) {
      const hold = clampPlaybackRateHold(effectsLab?.playbackRateHold ?? PLAYBACK_RATE_HOLD_DEFAULT);
      applyElementPlaybackRate(main, hold);
      applyElementPlaybackRate(mirror, hold);
    }
  }, [
    analyserAudioRef,
    bassBoost,
    effectsLab?.abBypass,
    effectsLab?.effectId,
    effectsLab?.outputTrimDb,
    effectsLab?.playbackRateHold,
    effectsLab?.workletEnhance,
    effectsLab?.enabled,
    isPlaying,
    lofi,
    mainAudioRef,
    performanceFxActive,
    vcMirrorPlaybackActive,
    volume,
  ]);
}
