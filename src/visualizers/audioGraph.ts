/**
 * One Web Audio graph per <audio> element — survives React StrictMode remounts.
 * createMediaElementSource may only be called once per element.
 */

type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
};

const graphs = new WeakMap<HTMLAudioElement, AudioGraph>();

const FFT_SIZE = 2048;

export function getOrCreateAudioGraph(audio: HTMLAudioElement): AudioGraph {
  const existing = graphs.get(audio);
  if (existing) return existing;

  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);
  analyser.connect(context.destination);

  const graph = { context, analyser };
  graphs.set(audio, graph);
  return graph;
}

export function resumeAudioContext(context: AudioContext): void {
  if (context.state === 'suspended') {
    void context.resume();
  }
}

export { FFT_SIZE };
