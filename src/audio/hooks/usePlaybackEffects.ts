import { useEffect } from 'react';

import type { EffectsLabState } from '../effectsLab/types';
import {
  configureMirrorPlaybackEffectsGraph,
  isMirrorPlaybackAudible,
  resetMirrorToTapGraph,
} from '../graph/configureMirrorPlaybackEffects';
import { getAudioGraphIfExists } from '../graph/registry';

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
   * VC projection window is audibly mirroring the same track — silence mirror graph speakers
   * and let VC window own the FX chain (no duplicate audible stream).
   */
  vcMirrorPlaybackActive?: boolean;
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
}: UsePlaybackEffectsOptions): void {
  const input = { bassBoost, lofi, effectsLab };
  const mirrorAudible = isMirrorPlaybackAudible(input);

  useEffect(() => {
    const main = mainAudioRef.current;
    const mirror = analyserAudioRef.current;
    if (!main || !mirror) return;

    // VC window plays the track for capture with FX — main mirror stays analyser-only.
    if (mirrorAudible && vcMirrorPlaybackActive) {
      main.volume = 0;
      resetMirrorToTapGraph(mirror, 0);
      return;
    }

    if (mirrorAudible) {
      main.volume = 0;
      configureMirrorPlaybackEffectsGraph(mirror, input, { speakerGain: 1, isPlaying });
      return;
    }

    if (vcMirrorPlaybackActive) {
      main.volume = 0;
    } else {
      main.volume = volume;
    }
    if (!getAudioGraphIfExists(mirror)) return;
    resetMirrorToTapGraph(mirror, 0);
  }, [
    analyserAudioRef,
    bassBoost,
    effectsLab?.abBypass,
    effectsLab?.effectId,
    effectsLab?.outputTrimDb,
    effectsLab?.workletEnhance,
    effectsLab?.enabled,
    isPlaying,
    lofi,
    mainAudioRef,
    mirrorAudible,
    vcMirrorPlaybackActive,
    volume,
  ]);
}
