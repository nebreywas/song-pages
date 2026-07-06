import { ANALYSER_SMOKE_MIN_PEAK } from '../constants';
import type { AudioGraph } from '../types';
import { measureFrequencyBins } from '../analysis/frequencyBins';
import { buildAudioGraphFromSource } from './buildGraph';

export type AnalyserSmokeResult = {
  peak: number;
  avg: number;
  silent: boolean;
};

/**
 * CI / dev smoke: oscillator → tap graph → analyser must produce non-zero FFT.
 * Requires a real AudioContext (browser or standardized-audio-context in Node).
 */
export async function runOscillatorAnalyserSmoke(
  context: AudioContext,
  options: { waitMs?: number; minPeak?: number } = {},
): Promise<AnalyserSmokeResult> {
  const waitMs = options.waitMs ?? 80;
  const minPeak = options.minPeak ?? ANALYSER_SMOKE_MIN_PEAK;

  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = 440;

  const graph: AudioGraph = buildAudioGraphFromSource(context, oscillator, {
    mode: 'tap',
    connectSpeakers: false,
  });

  oscillator.start(0);
  if (context.state === 'suspended') {
    await context.resume();
  }

  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const bins = new Uint8Array(graph.analyser.frequencyBinCount);
  graph.analyser.getByteFrequencyData(bins as Uint8Array<ArrayBuffer>);
  const stats = measureFrequencyBins(bins);

  oscillator.stop();
  await context.close();

  if (stats.peak < minPeak) {
    throw new Error(`Analyser smoke failed: peak ${stats.peak} < ${minPeak}`);
  }

  return stats;
}

/** Tap-mode graphs must wire speakerGain at zero — required for silent FFT pull. */
export function assertTapGraphWiring(graph: AudioGraph): void {
  if (graph.mode !== 'tap') {
    throw new Error(`Expected tap mode, got ${graph.mode}`);
  }
  if (!graph.speakerGain) {
    throw new Error('Tap graph missing speakerGain');
  }
  if (graph.speakerGain.gain.value !== 0) {
    throw new Error(`Tap graph speakerGain should be 0, got ${graph.speakerGain.gain.value}`);
  }
}
