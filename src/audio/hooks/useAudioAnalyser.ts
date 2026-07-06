import { useEffect, useRef, useState } from 'react';

import {
  FFT_SIZE,
  ensureMirrorElementFeedsGraph,
  getAudioGraphIfExists,
  getOrCreateAnalyserGraph,
  resumeAudioContext,
} from '../graph/registry';
import type { ButterchurnAudioSettings } from '../types';
import { audioDebug } from '../debug/audioDebug';
import { tryPlayMirror } from './mirrorPlayback';

type UseAudioAnalyserOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  enabled: boolean;
};

type UseAudioAnalyserResult = {
  analyser: AnalyserNode | null;
  butterchurnTap: GainNode | null;
  applyButterchurnAudioSettings: ((settings: ButterchurnAudioSettings) => void) | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  audioContext: AudioContext | null;
};

/** Wire AnalyserNode to the hidden mirror <audio> — never the audible playback element. */
export function useAudioAnalyser({
  audioRef,
  isPlaying,
  enabled,
}: UseAudioAnalyserOptions): UseAudioAnalyserResult {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [butterchurnTap, setButterchurnTap] = useState<GainNode | null>(null);
  const [applyButterchurnAudioSettings, setApplyButterchurnAudioSettings] = useState<
    ((settings: ButterchurnAudioSettings) => void) | null
  >(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const frequencyDataRef = useRef(new Uint8Array(FFT_SIZE / 2));
  const timeDomainDataRef = useRef(new Uint8Array(FFT_SIZE));

  useEffect(() => {
    if (!enabled || !audioRef) {
      setAnalyser(null);
      setButterchurnTap(null);
      setApplyButterchurnAudioSettings(null);
      setAudioContext(null);
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      audioDebug.log('analyser', 'Mirror ref empty on enable', undefined, 'warn');
      return;
    }

    audioDebug.log('analyser', 'Analyser hook enabled', {
      readyState: audio.readyState,
      paused: audio.paused,
      src: Boolean(audio.currentSrc || audio.src),
    });

    let cancelled = false;
    let publishedGraph: ReturnType<typeof getAudioGraphIfExists> = null;

    const attachGraph = () => {
      const existing = getAudioGraphIfExists(audio);
      if (existing) return existing;

      if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
        return null;
      }

      audioDebug.log('analyser', 'Creating MediaElementSource graph on mirror');
      return getOrCreateAnalyserGraph(audio);
    };

    const publishGraph = () => {
      if (cancelled) return;

      const graph = attachGraph();
      if (!graph) return;

      if (publishedGraph !== graph) {
        publishedGraph = graph;
        audioDebug.log('analyser', 'Graph published to React', {
          mode: graph.mode,
          contextState: graph.context.state,
          fftSize: graph.analyser.fftSize,
        });
        setAnalyser(graph.analyser);
        setButterchurnTap(graph.butterchurnTap);
        setApplyButterchurnAudioSettings(() => graph.applyButterchurnAudioSettings);
        setAudioContext(graph.context);
        frequencyDataRef.current = new Uint8Array(graph.analyser.frequencyBinCount);
        timeDomainDataRef.current = new Uint8Array(graph.analyser.fftSize);
      }

      ensureMirrorElementFeedsGraph(audio);

      if (isPlaying && audio.paused) {
        resumeAudioContext(graph.context);
        void tryPlayMirror(audio, 'analyser');
      } else if (isPlaying) {
        resumeAudioContext(graph.context);
      }
    };

    const onMirrorActivity = () => publishGraph();

    audio.addEventListener('playing', onMirrorActivity);
    audio.addEventListener('loadedmetadata', onMirrorActivity);
    audio.addEventListener('canplay', onMirrorActivity);

    publishGraph();

    // Keep syncing until mirror metadata, playback, and React state align.
    const retryId = window.setInterval(() => {
      if (cancelled) return;
      publishGraph();
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(retryId);
      audio.removeEventListener('playing', onMirrorActivity);
      audio.removeEventListener('loadedmetadata', onMirrorActivity);
      audio.removeEventListener('canplay', onMirrorActivity);
    };
  }, [audioRef, enabled, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !audioContext) return;
    resumeAudioContext(audioContext);
  }, [isPlaying, audioContext]);

  return {
    analyser,
    butterchurnTap,
    applyButterchurnAudioSettings,
    frequencyData: frequencyDataRef.current,
    timeDomainData: timeDomainDataRef.current,
    audioContext,
  };
}
