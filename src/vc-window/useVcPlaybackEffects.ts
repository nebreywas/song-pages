import { useEffect } from 'react';

import type { VcAudioMirror } from '@shared/vcModeTypes';
import { applyVcAudibleRouting } from '../audio/AudioEffectsEngine';
import {
  applyElementPlaybackRate,
  clampPlaybackRateHold,
  PLAYBACK_RATE_HOLD_DEFAULT,
} from '../audio/effectsLab/playbackRate';
import { isPlaybackRateBurstActive } from '../audio/effectsLab/performance/rateBurst';

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

  useEffect(() => {
    if (!audioEl) return;

    applyVcAudibleRouting({
      audio: audioEl,
      volume,
      isPlaying,
      effects,
    });

    if (!isPlaybackRateBurstActive()) {
      const hold = clampPlaybackRateHold(
        effects?.effectsLab?.playbackRateHold ?? PLAYBACK_RATE_HOLD_DEFAULT,
      );
      applyElementPlaybackRate(audioEl, hold);
    }
  }, [
    audioEl,
    effects?.bassBoost,
    effects?.effectsLab?.abBypass,
    effects?.effectsLab?.effectId,
    effects?.effectsLab?.enabled,
    effects?.effectsLab?.outputTrimDb,
    effects?.effectsLab?.playbackRateHold,
    effects?.effectsLab?.workletEnhance,
    effects?.lofi,
    isPlaying,
    volume,
  ]);
}
