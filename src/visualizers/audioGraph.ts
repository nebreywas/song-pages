/**
 * One Web Audio graph per <audio> element — survives React StrictMode remounts.
 * createMediaElementSource may only be called once per element.
 *
 * Playback: source → bass shelf → lo-fi lowpass → lo-fi drive → analyser → destination
 * Butterchurn (parallel): lofi drive → sensitivity gain → bass emphasis → tap → Butterchurn only
 */

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

type AudioGraphEffects = {
  bassFilter: BiquadFilterNode;
  lofiLowpass: BiquadFilterNode;
  lofiDrive: WaveShaperNode;
};

type ButterchurnAudioNodes = {
  sensitivity: GainNode;
  bassEmphasis: BiquadFilterNode;
  tap: GainNode;
};

export type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
  /** Final node on the Butterchurn-only branch — connectAudio attaches here. */
  butterchurnTap: GainNode;
  butterchurnAudio: ButterchurnAudioNodes;
  effects: AudioGraphEffects;
  applyButterchurnAudioSettings: (settings: ButterchurnAudioSettings) => void;
};

const graphs = new WeakMap<HTMLAudioElement, AudioGraph>();

const FFT_SIZE = 2048;

const BASS_FREQUENCY_HZ = 110;
const BASS_GAIN_DB = 11;
const LOFI_LOWPASS_HZ = 2800;
const LOFI_DRIVE_AMOUNT = 0.22;

/** Butterchurn bass emphasis — separate from playback bass boost. */
const BUTTERCHURN_BASS_EMPHASIS_HZ = 120;
const BUTTERCHURN_BASS_EMPHASIS_MAX_DB = 12;

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

/** Apply menu toggles to the fixed effect nodes in the playback graph. */
export function applyPlaybackEffects(graph: AudioGraph, settings: PlaybackEffectSettings): void {
  graph.effects.bassFilter.gain.value = settings.bassBoost ? BASS_GAIN_DB : 0;
  graph.effects.lofiLowpass.frequency.value = settings.lofi ? LOFI_LOWPASS_HZ : 22050;
  graph.effects.lofiDrive.curve = settings.lofi ? LOFI_DRIVE_CURVE : LINEAR_CURVE;
}

/** Update Butterchurn-only branch — does not touch the speaker path. */
export function applyButterchurnAudioSettings(
  graph: AudioGraph,
  settings: ButterchurnAudioSettings,
): void {
  graph.applyButterchurnAudioSettings(settings);
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

  const butterchurnAudio = createButterchurnAudioNodes(context);

  source.connect(effects.bassFilter);
  effects.bassFilter.connect(effects.lofiLowpass);
  effects.lofiLowpass.connect(effects.lofiDrive);
  effects.lofiDrive.connect(analyser);
  analyser.connect(context.destination);

  // Parallel branch — same post-effect source, no connection to destination.
  effects.lofiDrive.connect(butterchurnAudio.sensitivity);

  const applyButterchurn = (settings: ButterchurnAudioSettings) => {
    butterchurnAudio.sensitivity.gain.value = settings.sensitivity;
    butterchurnAudio.bassEmphasis.gain.value = settings.bassEmphasis * BUTTERCHURN_BASS_EMPHASIS_MAX_DB;
  };

  const graph: AudioGraph = {
    context,
    analyser,
    butterchurnTap: butterchurnAudio.tap,
    butterchurnAudio,
    effects,
    applyButterchurnAudioSettings: applyButterchurn,
  };

  applyButterchurn({ sensitivity: 1, bassEmphasis: 0 });
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
