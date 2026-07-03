/**
 * One Web Audio graph per <audio> element — survives React StrictMode remounts.
 * createMediaElementSource may only be called once per element.
 *
 * Chain: source → bass shelf → lo-fi lowpass → lo-fi drive → analyser → destination
 */

export type PlaybackEffectSettings = {
  bassBoost: boolean;
  lofi: boolean;
};

type AudioGraphEffects = {
  bassFilter: BiquadFilterNode;
  lofiLowpass: BiquadFilterNode;
  lofiDrive: WaveShaperNode;
};

export type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
  effects: AudioGraphEffects;
};

const graphs = new WeakMap<HTMLAudioElement, AudioGraph>();

const FFT_SIZE = 2048;

const BASS_FREQUENCY_HZ = 110;
const BASS_GAIN_DB = 11;
const LOFI_LOWPASS_HZ = 2800;
const LOFI_DRIVE_AMOUNT = 0.22;

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

/** Apply menu toggles to the fixed effect nodes in the playback graph. */
export function applyPlaybackEffects(graph: AudioGraph, settings: PlaybackEffectSettings): void {
  graph.effects.bassFilter.gain.value = settings.bassBoost ? BASS_GAIN_DB : 0;
  graph.effects.lofiLowpass.frequency.value = settings.lofi ? LOFI_LOWPASS_HZ : 22050;
  graph.effects.lofiDrive.curve = settings.lofi ? LOFI_DRIVE_CURVE : LINEAR_CURVE;
}

export function getAudioGraphIfExists(audio: HTMLAudioElement): AudioGraph | null {
  return graphs.get(audio) ?? null;
}

export function getOrCreateAudioGraph(audio: HTMLAudioElement): AudioGraph {
  const existing = graphs.get(audio);
  if (existing) return existing;

  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const effects = createEffectsNodes(context);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.75;

  source.connect(effects.bassFilter);
  effects.bassFilter.connect(effects.lofiLowpass);
  effects.lofiLowpass.connect(effects.lofiDrive);
  effects.lofiDrive.connect(analyser);
  analyser.connect(context.destination);

  const graph = { context, analyser, effects };
  applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
  graphs.set(audio, graph);
  return graph;
}

export function resumeAudioContext(context: AudioContext): void {
  if (context.state === 'suspended') {
    void context.resume();
  }
}

export { FFT_SIZE };
