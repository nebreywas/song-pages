import {
  BUTTERCHURN_BASS_EMPHASIS_HZ,
  BUTTERCHURN_BASS_EMPHASIS_MAX_DB,
  BASS_FREQUENCY_HZ,
  BASS_GAIN_DB,
  FFT_SIZE,
  LOFI_DRIVE_AMOUNT,
  LOFI_LOWPASS_HZ,
} from '../constants';
import type {
  AudioGraph,
  AudioGraphEffects,
  BuildGraphOptions,
  ButterchurnAudioNodes,
  ButterchurnAudioSettings,
  PlaybackEffectSettings,
} from '../types';

function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 44100;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

const LINEAR_CURVE = makeDriveCurve(0);
const LOFI_DRIVE_CURVE = makeDriveCurve(LOFI_DRIVE_AMOUNT);

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
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.75;

  const butterchurnAudio = createButterchurnAudioNodes(context);

  source.connect(effects.bassFilter);
  effects.bassFilter.connect(effects.lofiLowpass);
  effects.lofiLowpass.connect(effects.lofiDrive);
  effects.lofiDrive.connect(analyser);

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
    applyButterchurnAudioSettings: applyButterchurn,
  };

  applyButterchurn({ sensitivity: 1, bassEmphasis: 0 });
  applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
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
