import { useEffect } from 'react';

import { isVcPerformanceEffectCommand } from '@shared/vcMode/performanceEffect';
import type { VcAudioMirror } from '@shared/vcModeTypes';

import { runPerformanceEffect } from '../audio/effectsLab/performance/runPerformanceEffect';
import { PLAYBACK_RATE_HOLD_DEFAULT } from '../audio/effectsLab/playbackRate';
import { getApp } from '../lib/bridge';

/**
 * Apply Effects Lab performance pads from the main player onto the VC capture stream.
 * Whole-song presets already arrive via vc:state → useVcPlaybackEffects.
 */
export function useVcPerformanceEffects(
  audioEl: HTMLAudioElement | null,
  audioMirror: VcAudioMirror | null | undefined,
): void {
  useEffect(() => {
    const app = getApp();
    if (!app?.vc?.onPerformanceEffect || !audioEl) return;

    return app.vc.onPerformanceEffect((payload) => {
      if (!isVcPerformanceEffectCommand(payload)) return;

      const volume = audioMirror?.volume ?? 1;
      const restorePlaybackRate =
        audioMirror?.playbackEffects?.effectsLab?.playbackRateHold ?? PLAYBACK_RATE_HOLD_DEFAULT;

      // Target is the VC element itself — never duck it; speakerGain carries loudness.
      runPerformanceEffect({
        targetAudio: audioEl,
        duckAudio: null,
        keepDuckMuted: true,
        speakerGain: volume,
        effectId: payload.effectId,
        phase: payload.phase,
        restorePlaybackRate,
      });
    });
  }, [
    audioEl,
    audioMirror?.volume,
    audioMirror?.playbackEffects?.effectsLab?.playbackRateHold,
  ]);
}
