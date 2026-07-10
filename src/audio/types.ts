export type PlaybackEffectSettings = {
  bassBoost: boolean;
  lofi: boolean;
};

/** Visualizer-only tuning — parallel branch, never wired to destination. */
export type ButterchurnAudioSettings = {
  /** Input gain into Butterchurn's analyser (0.5–2). */
  sensitivity: number;
  /** 0–1 scalar mapped to lowshelf boost for kick/bass weighting. */
  bassEmphasis: number;
};

export type AudioGraphEffects = {
  bassFilter: BiquadFilterNode;
  lofiLowpass: BiquadFilterNode;
  lofiDrive: WaveShaperNode;
};

export type ButterchurnAudioNodes = {
  sensitivity: GainNode;
  bassEmphasis: BiquadFilterNode;
  tap: GainNode;
};

export type AudioGraphLabNodes = {
  highpass: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  midPeaking: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  outputTrim: GainNode;
  spatial: import('../effectsLab/spatial/labSpatialNodes').LabSpatialNodes;
};

export type AudioGraphPerformanceNodes =
  import('../effectsLab/performance/labPerformanceNodes').LabPerformanceNodes;

export type AudioGraphTapeModulationNodes =
  import('../effectsLab/worklet/labWorkletEnhance').LabWorkletEnhanceNodes;

export type AudioGraphWorkletEnhanceNodes = AudioGraphTapeModulationNodes;

export type AudioGraphMode = 'tap' | 'playback';

export type AudioGraph = {
  mode: AudioGraphMode;
  context: AudioContext;
  analyser: AnalyserNode;
  /** Zero gain in tap mode; raised in playback mode for audible FX. */
  speakerGain: GainNode | null;
  /** Final node on the Butterchurn-only branch — connectAudio attaches here. */
  butterchurnTap: GainNode;
  butterchurnAudio: ButterchurnAudioNodes;
  effects: AudioGraphEffects;
  /** Discovery-lab EQ / dynamics chain after legacy bass-lofi nodes. */
  lab: AudioGraphLabNodes;
  /** Phase C momentary insert before spatial stage. */
  performance: AudioGraphPerformanceNodes;
  /** Phase D+ optional worklet enhance (lazy attach, swappable processor). */
  workletEnhance: AudioGraphWorkletEnhanceNodes;
  /** @deprecated Renamed workletEnhance */
  tapeMod: AudioGraphWorkletEnhanceNodes;
  applyButterchurnAudioSettings: (settings: ButterchurnAudioSettings) => void;
};

export type BuildGraphOptions = {
  mode: AudioGraphMode;
  connectSpeakers: boolean;
};
