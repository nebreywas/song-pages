import { useEffect } from 'react';

import {
  applyPlaybackEffects,
  getAudioGraphIfExists,
  getOrCreateAudioGraph,
  resumeAudioContext,
} from '../visualizers/audioGraph';

type UsePlaybackEffectsOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  bassBoost: boolean;
  lofi: boolean;
};

/** Wire bass boost / lo-fi toggles into the listener audio graph. */
export function usePlaybackEffects({
  audioRef,
  isPlaying,
  bassBoost,
  lofi,
}: UsePlaybackEffectsOptions): void {
  const effectsActive = bassBoost || lofi;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (effectsActive) {
      const graph = getOrCreateAudioGraph(audio);
      applyPlaybackEffects(graph, { bassBoost, lofi });
      if (isPlaying) {
        resumeAudioContext(graph.context);
      }
      return;
    }

    const graph = getAudioGraphIfExists(audio);
    if (graph) {
      applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
    }
  }, [audioRef, bassBoost, effectsActive, isPlaying, lofi]);
}
