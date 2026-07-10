import { useEffect } from 'react';

import type { VcAudioMirror } from '@shared/vcModeTypes';
import { isVcPlaybackEffectsAudible } from '@shared/vcMode/playbackEffectsMirror';
import {
  configureMirrorPlaybackEffectsGraph,
  resetMirrorToTapGraph,
} from '../audio/graph/configureMirrorPlaybackEffects';

/**
 * Bass / lo-fi / Effects Lab on the VC window <audio> element so screen capture
 * includes processed audio. Main listener speakers stay muted while VC mirrors.
 */
export function useVcPlaybackEffects(
  audioEl: HTMLAudioElement | null,
  audioMirror: VcAudioMirror | null | undefined,
  isPlaying: boolean,
): void {
  const volume = audioMirror?.volume ?? 1;
  const effects = audioMirror?.playbackEffects;
  const bassBoost = effects?.bassBoost ?? false;
  const lofi = effects?.lofi ?? false;
  const effectsLab = effects?.effectsLab;
  const mirrorAudible = effects ? isVcPlaybackEffectsAudible(effects) : false;

  useEffect(() => {
    if (!audioEl) return;

    if (mirrorAudible) {
      // Web Audio pulls from the element — keep full-scale decode; loudness via speakerGain.
      audioEl.volume = 1;
      configureMirrorPlaybackEffectsGraph(
        audioEl,
        { bassBoost, lofi, effectsLab },
        { speakerGain: volume, isPlaying },
      );
      return;
    }

    // Dry path — native volume unless a prior FX session left a graph on this element.
    audioEl.volume = volume;
    resetMirrorToTapGraph(audioEl, volume);
  }, [
    audioEl,
    bassBoost,
    effectsLab?.abBypass,
    effectsLab?.effectId,
    effectsLab?.enabled,
    effectsLab?.outputTrimDb,
    effectsLab?.workletEnhance,
    isPlaying,
    lofi,
    mirrorAudible,
    volume,
  ]);
}
