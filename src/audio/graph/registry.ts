/**
 * One graph per mirror <audio> element (WeakMap). Main audible player never gets a graph.
 *
 * @see documentation/audio-pipeline.md
 */
import { FFT_SIZE } from '../constants';
import type { AudioGraph, ButterchurnAudioSettings } from '../types';
import {
  applyButterchurnAudioSettings,
  applyPlaybackEffects,
  buildAudioGraphFromSource,
  disposeAudioGraph,
} from './buildGraph';
import { ensureMirrorElementFeedsGraph } from './mirrorElement';

const graphs = new WeakMap<HTMLAudioElement, AudioGraph>();

function captureElementStream(audio: HTMLAudioElement): MediaStream | null {
  if (typeof audio.captureStream === 'function') {
    return audio.captureStream();
  }
  const legacyCapture = (audio as HTMLAudioElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream;
  if (typeof legacyCapture === 'function') {
    return legacyCapture.call(audio);
  }
  return null;
}

function logGraphEvent(message: string, data?: Record<string, unknown>): void {
  void import('../debug/audioDebug').then(({ audioDebug }) => {
    audioDebug.log('audioGraph', message, data);
  });
}

export function getAudioGraphIfExists(audio: HTMLAudioElement): AudioGraph | null {
  return graphs.get(audio) ?? null;
}

export { ensureMirrorElementFeedsGraph } from './mirrorElement';

/**
 * Non-destructive analyser tap — leaves native <audio> output intact for screen capture.
 * Returns null until the element has an active audio track (usually after `playing`).
 */
export function tryCreateAnalyserTap(audio: HTMLAudioElement): AudioGraph | null {
  const existing = graphs.get(audio);
  if (existing) return existing;

  const stream = captureElementStream(audio);
  if (!stream || stream.getAudioTracks().length === 0) {
    return null;
  }

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const graph = buildAudioGraphFromSource(context, source, { mode: 'tap', connectSpeakers: false });
  graphs.set(audio, graph);
  return graph;
}

/**
 * Analyser graph on the mirror element — one createMediaElementSource per element for life.
 * Speaker path uses zero gain so FFT runs without audible output on the mirror.
 */
export function getOrCreateAnalyserGraph(audio: HTMLAudioElement): AudioGraph {
  const existing = graphs.get(audio);
  if (existing) {
    ensureMirrorElementFeedsGraph(audio);
    return existing;
  }

  ensureMirrorElementFeedsGraph(audio);

  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const graph = buildAudioGraphFromSource(context, source, { mode: 'tap', connectSpeakers: false });
  graphs.set(audio, graph);

  logGraphEvent('Analyser graph created (MediaElementSource)', {
    contextState: context.state,
    readyState: audio.readyState,
    paused: audio.paused,
    muted: audio.muted,
    volume: audio.volume,
  });

  return graph;
}

function teardownGraphForElement(audio: HTMLAudioElement): void {
  const existing = graphs.get(audio);
  if (!existing) return;
  disposeAudioGraph(existing);
  graphs.delete(audio);
}

/** Same graph as analyser mode — raises speaker gain for audible FX on the mirror path. */
export function getOrCreatePlaybackGraph(audio: HTMLAudioElement): AudioGraph {
  const graph = getOrCreateAnalyserGraph(audio);
  graph.mode = 'playback';
  if (graph.speakerGain) {
    graph.speakerGain.gain.value = 1;
  }
  return graph;
}

/** @deprecated Prefer getOrCreateAnalyserGraph or getOrCreatePlaybackGraph. */
export function getOrCreateAudioGraph(audio: HTMLAudioElement): AudioGraph {
  return getOrCreatePlaybackGraph(audio);
}

export function resumeAudioContext(context: AudioContext): void {
  if (context.state === 'suspended') {
    void context.resume();
  }
}

/** Route mirror playback to speakers (playback graph only). */
export function setMainSpeakerMuted(audio: HTMLAudioElement, muted: boolean): void {
  const graph = graphs.get(audio);
  if (graph?.mode === 'playback' && graph.speakerGain) {
    graph.speakerGain.gain.value = muted ? 0 : 1;
  }
}

export function releaseAudioGraph(audio: HTMLAudioElement): void {
  teardownGraphForElement(audio);
}

export {
  applyButterchurnAudioSettings,
  applyPlaybackEffects,
  resolvePlaybackEffectParams,
} from './buildGraph';

export { FFT_SIZE };
