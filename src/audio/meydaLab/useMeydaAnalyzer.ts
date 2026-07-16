/**
 * Meyda Lab feature probe — read-only off the shared AnalyserNode.
 *
 * Why not Meyda.createMeydaAnalyzer?
 * That factory createScriptProcessor + connects it to audioContext.destination,
 * which can leak the silent mirror to speakers and fights our one-graph rules.
 * Instead we sample the AnalyserBus FFT tap with getFloatTimeDomainData and
 * call Meyda.extract() — same audio path Butterchurn already uses.
 */

import Meyda, { type MeydaAudioFeature, type MeydaFeaturesObject } from 'meyda';
import { useEffect, useRef, useState } from 'react';

import { bandEnergiesFromSpectrum, type BandEnergies } from './bandEnergy';
import {
  MEYDA_CORE_FEATURES,
  type MeydaLabFeatureId,
} from './features';
import { createNarrativeTracker, type NarrativeEvent } from './narrative';

export type MeydaLiveFeatures = Partial<MeydaFeaturesObject> & {
  updatedAt: number | null;
  bands: BandEnergies;
};

const EMPTY_BANDS: BandEnergies = {
  bass: 0,
  mid: 0,
  treble: 0,
  bassShare: 0,
  midShare: 0,
  trebleShare: 0,
};

const EMPTY: MeydaLiveFeatures = { updatedAt: null, bands: EMPTY_BANDS };

/** ~15 UI updates/sec — enough for meters, cheap on React. */
const UI_PERIOD_MS = 66;

export type UseMeydaAnalyzerOptions = {
  enabled: boolean;
  audioContext: AudioContext | null;
  /** Shared graph AnalyserNode from AnalyserBus (required). */
  analyser: AnalyserNode | null;
  featureIds: readonly MeydaLabFeatureId[];
};

export type UseMeydaAnalyzerResult = {
  features: MeydaLiveFeatures;
  narrative: NarrativeEvent[];
  running: boolean;
  error: string | null;
  resetNarrative: () => void;
};

export function useMeydaAnalyzer({
  enabled,
  audioContext,
  analyser,
  featureIds,
}: UseMeydaAnalyzerOptions): UseMeydaAnalyzerResult {
  const [features, setFeatures] = useState<MeydaLiveFeatures>(EMPTY);
  const [narrative, setNarrative] = useState<NarrativeEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackerRef = useRef(createNarrativeTracker());
  const prevSignalRef = useRef<Float32Array | null>(null);
  const featureIdsRef = useRef(featureIds);
  featureIdsRef.current = featureIds;

  const resetNarrative = () => {
    trackerRef.current.reset();
    setNarrative([]);
  };

  useEffect(() => {
    if (!enabled) {
      setRunning(false);
      setFeatures(EMPTY);
      prevSignalRef.current = null;
      return;
    }

    if (!audioContext || !analyser) {
      setRunning(false);
      setError('Waiting for mirror AnalyserNode (play a local track).');
      return;
    }

    let cancelled = false;
    let raf = 0;
    let lastUiAt = 0;
    const signal = new Float32Array(analyser.fftSize);

    setError(null);
    setRunning(true);
    void audioContext.resume().catch(() => {
      /* user gesture may already have unlocked context */
    });

    const tick = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);

      try {
        analyser.getFloatTimeDomainData(signal);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setRunning(false);
        }
        return;
      }

      // Keep Meyda’s global knobs aligned with this AnalyserNode.
      Meyda.bufferSize = analyser.fftSize;
      Meyda.sampleRate = audioContext.sampleRate;

      const extractors = [
        ...(featureIdsRef.current.length > 0 ? featureIdsRef.current : MEYDA_CORE_FEATURES),
        // amplitudeSpectrum → derived bass/mid/treble shares.
        // Note: Meyda 5.6.3 spectralFlux extractor throws (broken); we DIY flux below.
        'amplitudeSpectrum',
      ] as MeydaAudioFeature[];

      let next: Partial<MeydaFeaturesObject> | null = null;
      try {
        next = Meyda.extract(extractors, signal);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
        return;
      }

      // DIY half-wave spectral flux vs previous time domain (punch detector for narrative).
      let spectralFlux: number | undefined;
      const prev = prevSignalRef.current;
      if (prev && prev.length === signal.length) {
        let flux = 0;
        for (let i = 0; i < signal.length; i += 1) {
          const delta = Math.abs(signal[i]!) - Math.abs(prev[i]!);
          if (delta > 0) flux += delta;
        }
        spectralFlux = flux / signal.length;
      }

      // Copy for next DIY flux frame.
      if (!prevSignalRef.current || prevSignalRef.current.length !== signal.length) {
        prevSignalRef.current = new Float32Array(signal.length);
      }
      prevSignalRef.current.set(signal);

      if (!next || now - lastUiAt < UI_PERIOD_MS) return;
      lastUiAt = now;

      const rms = typeof next.rms === 'number' ? next.rms : 0;
      const energy = typeof next.energy === 'number' ? next.energy : 0;
      // Meyda’s spectralCentroid is a bin-space moment — convert to Hz for meters/narrative.
      const centroidBins =
        typeof next.spectralCentroid === 'number' ? next.spectralCentroid : 0;
      const centroid =
        centroidBins * (audioContext.sampleRate / Math.max(1, analyser.fftSize));
      const flatness =
        typeof next.spectralFlatness === 'number' ? next.spectralFlatness : 0;
      const zcr = typeof next.zcr === 'number' ? next.zcr : 0;

      const bands = bandEnergiesFromSpectrum(
        next.amplitudeSpectrum,
        audioContext.sampleRate,
        analyser.fftSize,
      );

      setError(null);
      setFeatures({
        ...next,
        // Replace bin centroid with Hz so UI max=8000 makes sense.
        spectralCentroid: centroid,
        updatedAt: now,
        bands,
      });
      setNarrative([
        ...trackerRef.current.ingest(now, {
          rms,
          energy,
          centroid,
          flatness,
          zcr,
          bassShare: bands.bassShare,
          trebleShare: bands.trebleShare,
          spectralFlux,
        }),
      ]);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      setRunning(false);
      prevSignalRef.current = null;
    };
  }, [enabled, audioContext, analyser]);

  return { features, narrative, running, error, resetNarrative };
}
