import { useEffect } from 'react';

import {
  applyPlaybackEffects,
  getAudioGraphIfExists,
  getOrCreatePlaybackGraph,
  resumeAudioContext,
} from '../graph/registry';

type UsePlaybackEffectsOptions = {
  /** Audible player — ducked while FX run on the mirror element. Never gets Web Audio. */
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
  /** Hidden mirror — bass / lo-fi Web Audio runs here so main stays capturable. */
  analyserAudioRef: React.RefObject<HTMLAudioElement | null>;
  volume: number;
  isPlaying: boolean;
  bassBoost: boolean;
  lofi: boolean;
};

/** Bass boost / lo-fi on the mirror element; main playback stays native for stream capture. */
export function usePlaybackEffects({
  mainAudioRef,
  analyserAudioRef,
  volume,
  isPlaying,
  bassBoost,
  lofi,
}: UsePlaybackEffectsOptions): void {
  const effectsActive = bassBoost || lofi;

  useEffect(() => {
    const main = mainAudioRef.current;
    const mirror = analyserAudioRef.current;
    if (!main || !mirror) return;

    if (effectsActive) {
      main.volume = 0;
      const graph = getOrCreatePlaybackGraph(mirror);
      applyPlaybackEffects(graph, { bassBoost, lofi });
      if (graph.speakerGain) {
        graph.speakerGain.gain.value = 1;
      }
      if (isPlaying) {
        resumeAudioContext(graph.context);
      }
      return;
    }

    main.volume = volume;
    const graph = getAudioGraphIfExists(mirror);
    if (!graph) return;

    graph.mode = 'tap';
    applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
    if (graph.speakerGain) {
      graph.speakerGain.gain.value = 0;
    }
  }, [analyserAudioRef, bassBoost, effectsActive, isPlaying, lofi, mainAudioRef, volume]);
}
