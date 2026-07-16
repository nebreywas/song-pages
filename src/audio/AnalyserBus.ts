/**
 * Single Web Audio graph attachment per hidden mirror `<audio>` element.
 * Multiple consumers (visualizer, VC FFT) register via `useAnalyserBus` — one graph, many subscribers.
 *
 * @see documentation/audio-pipeline.md
 */
import type { RefObject } from 'react';

import { FFT_SIZE } from './constants';
import { audioDebug } from './debug/audioDebug';
import {
  ensureMirrorElementFeedsGraph,
  getAudioGraphIfExists,
  getOrCreateAnalyserGraph,
  resumeAudioContext,
} from './graph/registry';
import { tryPlayMirror } from './hooks/mirrorPlayback';
import type { ButterchurnAudioSettings } from './types';

export type AnalyserBusState = {
  analyser: AnalyserNode | null;
  butterchurnTap: GainNode | null;
  applyButterchurnAudioSettings: ((settings: ButterchurnAudioSettings) => void) | null;
  audioContext: AudioContext | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
};

type ConsumerRecord = {
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  enabled: boolean;
  listener: (state: AnalyserBusState) => void;
};

const EMPTY_FREQUENCY = new Uint8Array(FFT_SIZE / 2);
const EMPTY_TIME_DOMAIN = new Uint8Array(FFT_SIZE);

export function createEmptyAnalyserBusState(): AnalyserBusState {
  return {
    analyser: null,
    butterchurnTap: null,
    applyButterchurnAudioSettings: null,
    audioContext: null,
    frequencyData: EMPTY_FREQUENCY,
    timeDomainData: EMPTY_TIME_DOMAIN,
  };
}

const consumers = new Map<string, ConsumerRecord>();
let attachedElement: HTMLAudioElement | null = null;
let attachCleanup: (() => void) | null = null;
let retryTimer: number | null = null;
let publishedState = createEmptyAnalyserBusState();
/** Graph identity last published — avoid reallocating FFT buffers / React churn every retry tick. */
let publishedGraphKey: object | null = null;

function notifyListeners(): void {
  for (const consumer of consumers.values()) {
    consumer.listener(publishedState);
  }
}

function publishEmpty(): void {
  publishedGraphKey = null;
  publishedState = createEmptyAnalyserBusState();
  notifyListeners();
}

function publishGraph(graph: NonNullable<ReturnType<typeof getAudioGraphIfExists>>): void {
  // Same AudioGraph instance → keep stable Uint8Array refs so consumers do not remount RAF loops.
  if (publishedGraphKey === graph) {
    return;
  }

  publishedGraphKey = graph;
  publishedState = {
    analyser: graph.analyser,
    butterchurnTap: graph.butterchurnTap,
    applyButterchurnAudioSettings: graph.applyButterchurnAudioSettings,
    audioContext: graph.context,
    frequencyData: new Uint8Array(graph.analyser.frequencyBinCount),
    timeDomainData: new Uint8Array(graph.analyser.fftSize),
  };
  notifyListeners();
}

function teardownAttach(): void {
  attachCleanup?.();
  attachCleanup = null;
  if (retryTimer != null) {
    window.clearInterval(retryTimer);
    retryTimer = null;
  }
}

function pickActiveConsumer(): ConsumerRecord | null {
  for (const consumer of consumers.values()) {
    if (consumer.enabled && consumer.audioRef.current) {
      return consumer;
    }
  }
  return null;
}

function attachToElement(audio: HTMLAudioElement, isPlaying: boolean): void {
  const attachGraph = () => {
    const existing = getAudioGraphIfExists(audio);
    if (existing) {
      ensureMirrorElementFeedsGraph(audio);
      publishGraph(existing);
      if (isPlaying) {
        resumeAudioContext(existing.context);
        if (audio.paused) {
          void tryPlayMirror(audio, 'analyser-bus');
        }
      }
      return existing;
    }

    if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
      return null;
    }

    audioDebug.log('analyser', 'AnalyserBus creating graph on mirror');
    const graph = getOrCreateAnalyserGraph(audio);
    ensureMirrorElementFeedsGraph(audio);
    publishGraph(graph);

    if (isPlaying) {
      resumeAudioContext(graph.context);
      if (audio.paused) {
        void tryPlayMirror(audio, 'analyser-bus');
      }
    }
    return graph;
  };

  const onMirrorActivity = () => {
    attachGraph();
  };

  audio.addEventListener('playing', onMirrorActivity);
  audio.addEventListener('loadedmetadata', onMirrorActivity);
  audio.addEventListener('canplay', onMirrorActivity);

  attachGraph();

  const retryId = window.setInterval(() => {
    attachGraph();
  }, 400);

  attachCleanup = () => {
    window.clearInterval(retryId);
    audio.removeEventListener('playing', onMirrorActivity);
    audio.removeEventListener('loadedmetadata', onMirrorActivity);
    audio.removeEventListener('canplay', onMirrorActivity);
  };
}

/** Reconcile a single graph attachment for all enabled consumers on the shared mirror element. */
export function syncAnalyserBus(): void {
  const active = pickActiveConsumer();
  const element = active?.audioRef.current ?? null;
  const isPlaying = active?.isPlaying ?? false;

  if (!active || !element) {
    teardownAttach();
    attachedElement = null;
    publishEmpty();
    return;
  }

  if (element !== attachedElement) {
    teardownAttach();
    attachedElement = element;
    attachToElement(element, isPlaying);
    return;
  }

  if (isPlaying && publishedState.audioContext) {
    resumeAudioContext(publishedState.audioContext);
    if (element.paused) {
      void tryPlayMirror(element, 'analyser-bus');
    }
  }
}

export function scheduleAnalyserBusSync(): void {
  syncAnalyserBus();
}

export function registerAnalyserConsumer(
  consumerId: string,
  record: Omit<ConsumerRecord, 'listener'> & { onState: (state: AnalyserBusState) => void },
): () => void {
  consumers.set(consumerId, {
    audioRef: record.audioRef,
    isPlaying: record.isPlaying,
    enabled: record.enabled,
    listener: record.onState,
  });
  scheduleAnalyserBusSync();
  return () => {
    consumers.delete(consumerId);
    scheduleAnalyserBusSync();
  };
}

export function updateAnalyserConsumer(
  consumerId: string,
  patch: Partial<Pick<ConsumerRecord, 'isPlaying' | 'enabled'>>,
): void {
  const existing = consumers.get(consumerId);
  if (!existing) return;
  consumers.set(consumerId, { ...existing, ...patch });
}

export function getAnalyserBusPublishedState(): AnalyserBusState {
  return publishedState;
}
