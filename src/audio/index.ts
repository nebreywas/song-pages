/**
 * Song Pages audio module — playback mirror, Web Audio graph, hooks, diagnostics.
 *
 * @see documentation/audio-pipeline.md
 */

export { FFT_SIZE, ANALYSER_SMOKE_MIN_PEAK } from './constants';

export type {
  AudioGraph,
  AudioGraphMode,
  ButterchurnAudioSettings,
  PlaybackEffectSettings,
} from './types';

export {
  applyButterchurnAudioSettings,
  applyPlaybackEffects,
  ensureMirrorElementFeedsGraph,
  getAudioGraphIfExists,
  getOrCreateAnalyserGraph,
  getOrCreateAudioGraph,
  getOrCreatePlaybackGraph,
  releaseAudioGraph,
  resumeAudioContext,
  resolvePlaybackEffectParams,
  setMainSpeakerMuted,
  tryCreateAnalyserTap,
} from './graph/registry';

export { buildAudioGraphFromSource } from './graph/buildGraph';
export { mirrorElementBlocksWebAudio } from './graph/mirrorElement';
export { assertTapGraphWiring, runOscillatorAnalyserSmoke } from './graph/analyserSmoke';

export { measureFrequencyBins } from './analysis/frequencyBins';
export { snapshotAudioElement } from './analysis/snapshotElement';

export { useAudioAnalyser } from './hooks/useAudioAnalyser';
export { useAnalyserPlaybackMirror } from './hooks/useAnalyserPlaybackMirror';
export { usePlaybackEffects } from './hooks/usePlaybackEffects';

export { audioDebug, emptyAudioDebugSnapshot } from './debug/audioDebug';
export { AudioDebugPanel, useAudioDebugHotkey } from './debug/AudioDebugPanel';
export { useAudioDebugReporter } from './debug/useAudioDebugReporter';

export type {
  AudioDebugEvent,
  AudioDebugLevel,
  AudioDebugSnapshot,
  AudioElementSnapshot,
} from './debug/types';
