import { useEffect, useRef, useState } from 'react';

import { FFT_SIZE, getOrCreateAudioGraph, resumeAudioContext } from './audioGraph';

type UseAudioAnalyserOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  enabled: boolean;
};

type UseAudioAnalyserResult = {
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  audioContext: AudioContext | null;
};

/** Wire AnalyserNode to the listener <audio> element when visualizers are active. */
export function useAudioAnalyser({
  audioRef,
  isPlaying,
  enabled,
}: UseAudioAnalyserOptions): UseAudioAnalyserResult {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const frequencyDataRef = useRef(new Uint8Array(FFT_SIZE / 2));
  const timeDomainDataRef = useRef(new Uint8Array(FFT_SIZE));

  useEffect(() => {
    if (!enabled) {
      setAnalyser(null);
      setAudioContext(null);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const graph = getOrCreateAudioGraph(audio);
    setAnalyser(graph.analyser);
    setAudioContext(graph.context);
    frequencyDataRef.current = new Uint8Array(graph.analyser.frequencyBinCount);
    timeDomainDataRef.current = new Uint8Array(graph.analyser.fftSize);
  }, [audioRef, enabled]);

  useEffect(() => {
    if (!isPlaying || !audioContext) return;
    resumeAudioContext(audioContext);
  }, [isPlaying, audioContext]);

  return {
    analyser,
    frequencyData: frequencyDataRef.current,
    timeDomainData: timeDomainDataRef.current,
    audioContext,
  };
}
