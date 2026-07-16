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
export { useAnalyserBus } from './hooks/useAnalyserBus';
export { useAnalyserPlaybackMirror } from './hooks/useAnalyserPlaybackMirror';
export { usePlaybackEffects } from './hooks/usePlaybackEffects';

export { MediaCoordinator } from './MediaCoordinator';
export { applyMainMirrorRouting, applyVcAudibleRouting } from './AudioEffectsEngine';
export {
  createEmptyAnalyserBusState,
  getAnalyserBusPublishedState,
  scheduleAnalyserBusSync,
  type AnalyserBusState,
} from './AnalyserBus';

export {
  EffectsLabPanel,
  useEffectsLabHotkey,
  effectsLabStore,
  LAB_EFFECT_DEFINITIONS,
  DEFAULT_EFFECTS_LAB_STATE,
  isEffectsLabAudible,
} from './effectsLab';
export type { EffectsLabState, LabEffectId } from './effectsLab';

export {
  MeydaLabPanel,
  useMeydaLabHotkey,
  meydaLabStore,
  MEYDA_CORE_FEATURES,
  MEYDA_EXTRA_FEATURES,
} from './meydaLab';
export type { MeydaLabFeatureId } from './meydaLab';

export { audioDebug, emptyAudioDebugSnapshot } from './debug/audioDebug';
export { AudioDebugPanel, useAudioDebugHotkey } from './debug/AudioDebugPanel';
export { useAudioDebugReporter } from './debug/useAudioDebugReporter';

export type {
  AudioDebugEvent,
  AudioDebugLevel,
  AudioDebugSnapshot,
  AudioElementSnapshot,
} from './debug/types';
