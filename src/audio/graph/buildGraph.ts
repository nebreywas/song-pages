import {
  BUTTERCHURN_BASS_EMPHASIS_HZ,
  BUTTERCHURN_BASS_EMPHASIS_MAX_DB,
  BASS_FREQUENCY_HZ,
  BASS_GAIN_DB,
  FFT_SIZE,
  LOFI_LOWPASS_HZ,
} from '../constants';
import { LINEAR_CURVE, LOFI_DRIVE_CURVE } from './driveCurve';
import { applyLabEffectParams } from '../effectsLab/applyLabPreset';
import { bypassParams } from '../effectsLab/presets';
import {
  createLabPerformanceNodes,
  resetLabPerformanceNodes,
} from '../effectsLab/performance/labPerformanceNodes';
import { createLabSpatialNodes } from '../effectsLab/spatial/labSpatialNodes';
import {
  applyLabWorkletEnhance,
  createLabWorkletEnhanceNodes,
} from '../effectsLab/worklet/labWorkletEnhance';
import type {
  AudioGraph,
  AudioGraphEffects,
  AudioGraphLabNodes,
  BuildGraphOptions,
  ButterchurnAudioNodes,
  ButterchurnAudioSettings,
  PlaybackEffectSettings,
} from '../types';

function createEffectsNodes(context: AudioContext): AudioGraphEffects {
  const bassFilter = context.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = BASS_FREQUENCY_HZ;
  bassFilter.Q.value = 0.9;
  bassFilter.gain.value = 0;

  const lofiLowpass = context.createBiquadFilter();
  lofiLowpass.type = 'lowpass';
  lofiLowpass.frequency.value = 22050;
  lofiLowpass.Q.value = 0.7;

  const lofiDrive = context.createWaveShaper();
  lofiDrive.curve = LINEAR_CURVE;
  lofiDrive.oversample = '4x';

  return { bassFilter, lofiLowpass, lofiDrive };
}

function createLabNodes(context: AudioContext): Omit<AudioGraphLabNodes, 'spatial'> {
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 20;
  highpass.Q.value = 0.7;

  const highShelf = context.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 8000;
  highShelf.gain.value = 0;

  const midPeaking = context.createBiquadFilter();
  midPeaking.type = 'peaking';
  midPeaking.frequency.value = 800;
  midPeaking.Q.value = 1;
  midPeaking.gain.value = 0;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = 0;
  compressor.ratio.value = 1;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.knee.value = 6;

  const outputTrim = context.createGain();
  outputTrim.gain.value = 1;

  highpass.connect(highShelf);
  highShelf.connect(midPeaking);
  midPeaking.connect(compressor);
  compressor.connect(outputTrim);

  return { highpass, highShelf, midPeaking, compressor, outputTrim };
}

function createButterchurnAudioNodes(context: AudioContext): ButterchurnAudioNodes {
  const sensitivity = context.createGain();
  sensitivity.gain.value = 1;

  const bassEmphasis = context.createBiquadFilter();
  bassEmphasis.type = 'lowshelf';
  bassEmphasis.frequency.value = BUTTERCHURN_BASS_EMPHASIS_HZ;
  bassEmphasis.Q.value = 0.8;
  bassEmphasis.gain.value = 0;

  const tap = context.createGain();
  tap.gain.value = 1;

  sensitivity.connect(bassEmphasis);
  bassEmphasis.connect(tap);

  return { sensitivity, bassEmphasis, tap };
}

/** Pure mapping from UI toggles to effect node parameters — unit-testable without Web Audio. */
export function resolvePlaybackEffectParams(settings: PlaybackEffectSettings): {
  bassGainDb: number;
  lofiLowpassHz: number;
  lofiDriveActive: boolean;
} {
  return {
    bassGainDb: settings.bassBoost ? BASS_GAIN_DB : 0,
    lofiLowpassHz: settings.lofi ? LOFI_LOWPASS_HZ : 22050,
    lofiDriveActive: settings.lofi,
  };
}

/** Apply menu toggles to the fixed effect nodes in the playback graph. */
export function applyPlaybackEffects(graph: AudioGraph, settings: PlaybackEffectSettings): void {
  const params = resolvePlaybackEffectParams(settings);
  graph.effects.bassFilter.gain.value = params.bassGainDb;
  graph.effects.lofiLowpass.frequency.value = params.lofiLowpassHz;
  graph.effects.lofiDrive.curve = params.lofiDriveActive ? LOFI_DRIVE_CURVE : LINEAR_CURVE;
}

/** Build analyser + FX + Butterchurn branch from any AudioNode source (oscillator, MediaElement, stream). */
export function buildAudioGraphFromSource(
  context: AudioContext,
  source: AudioNode,
  options: BuildGraphOptions,
): AudioGraph {
  const effects = createEffectsNodes(context);
  const lab = createLabNodes(context);
  const workletEnhance = createLabWorkletEnhanceNodes(context);
  const performance = createLabPerformanceNodes(context);
  const spatial = createLabSpatialNodes(context);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.75;

  const butterchurnAudio = createButterchurnAudioNodes(context);

  source.connect(effects.bassFilter);
  effects.bassFilter.connect(effects.lofiLowpass);
  effects.lofiLowpass.connect(effects.lofiDrive);
  effects.lofiDrive.connect(lab.highpass);
  lab.outputTrim.connect(workletEnhance.input);
  workletEnhance.output.connect(performance.input);
  performance.output.connect(spatial.input);
  spatial.output.connect(analyser);

  let speakerGain: GainNode | null = null;
  if (options.connectSpeakers) {
    speakerGain = context.createGain();
    speakerGain.gain.value = 1;
    analyser.connect(speakerGain);
    speakerGain.connect(context.destination);
  } else {
    // MediaElementSource must reach destination (even at zero gain) or the graph
    // does not pull samples and AnalyserNode stays flat.
    speakerGain = context.createGain();
    speakerGain.gain.value = 0;
    analyser.connect(speakerGain);
    speakerGain.connect(context.destination);
  }

  effects.lofiDrive.connect(butterchurnAudio.sensitivity);

  const applyButterchurn = (settings: ButterchurnAudioSettings) => {
    butterchurnAudio.sensitivity.gain.value = settings.sensitivity;
    butterchurnAudio.bassEmphasis.gain.value = settings.bassEmphasis * BUTTERCHURN_BASS_EMPHASIS_MAX_DB;
  };

  const graph: AudioGraph = {
    mode: options.mode,
    context,
    analyser,
    speakerGain,
    butterchurnTap: butterchurnAudio.tap,
    butterchurnAudio,
    effects,
    lab: { ...lab, spatial },
    performance,
    workletEnhance,
    tapeMod: workletEnhance,
    applyButterchurnAudioSettings: applyButterchurn,
  };

  applyButterchurn({ sensitivity: 1, bassEmphasis: 0 });
  applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
  applyLabEffectParams(graph, bypassParams());
  applyLabWorkletEnhance(workletEnhance, null, false);
  resetLabPerformanceNodes(performance, context);
  return graph;
}

export function disposeAudioGraph(graph: AudioGraph): void {
  void graph.context.close();
}

/** Update Butterchurn-only branch — does not touch the speaker path. */
export function applyButterchurnAudioSettings(
  graph: AudioGraph,
  settings: ButterchurnAudioSettings,
): void {
  graph.applyButterchurnAudioSettings(settings);
}

export { LINEAR_CURVE, LOFI_DRIVE_CURVE };
