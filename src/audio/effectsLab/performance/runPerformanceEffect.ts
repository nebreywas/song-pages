import {
  getOrCreatePlaybackGraph,
  resumeAudioContext,
} from '../../graph/registry';
import type { AudioGraph } from '../../types';
import { getLabImpulseResponse } from '../spatial/impulseResponse';
import { resetLabPerformanceNodes, type LabPerformanceNodes } from './labPerformanceNodes';
import type {
  FilterSweepLength,
  PerformanceEffectId,
  PerformanceEffectPhase,
} from './types';
import { performanceEffectRestoreMs } from './types';

export type RunPerformanceEffectOptions = {
  mirrorAudio: HTMLAudioElement;
  mainAudio: HTMLAudioElement;
  /** Main element volume to restore when mirror duck ends. */
  mainVolume: number;
  /** When true, leave main ducked after one-shot effects (whole-song lab active). */
  keepMirrorAudible: boolean;
  effectId: PerformanceEffectId;
  phase: PerformanceEffectPhase;
};

let holdCount = 0;

function ensurePlaybackGraph(
  mirrorAudio: HTMLAudioElement,
  mainAudio: HTMLAudioElement,
): AudioGraph {
  mainAudio.volume = 0;
  const graph = getOrCreatePlaybackGraph(mirrorAudio);
  resumeAudioContext(graph.context);
  if (graph.speakerGain) {
    graph.speakerGain.gain.value = 1;
  }
  return graph;
}

function maybeRestoreMainPath(
  mainAudio: HTMLAudioElement,
  mainVolume: number,
  keepMirrorAudible: boolean,
): void {
  if (keepMirrorAudible || holdCount > 0) return;
  mainAudio.volume = mainVolume;
}

function runFilterSweep(
  nodes: LabPerformanceNodes,
  context: AudioContext,
  length: FilterSweepLength,
): void {
  const t = context.currentTime;
  const { filter } = nodes;
  const short = length === 'short';

  filter.type = 'lowpass';
  filter.Q.setValueAtTime(short ? 0.85 : 0.72, t);
  filter.frequency.cancelScheduledValues(t);
  filter.frequency.setValueAtTime(12000, t);
  filter.frequency.exponentialRampToValueAtTime(260, t + (short ? 1.35 : 2.45));
  filter.frequency.exponentialRampToValueAtTime(22050, t + (short ? 3.05 : 5.85));
}

function runMomentaryLowPass(
  nodes: LabPerformanceNodes,
  context: AudioContext,
  phase: PerformanceEffectPhase,
): void {
  const t = context.currentTime;
  const { filter } = nodes;

  if (phase === 'hold') {
    holdCount += 1;
    filter.type = 'lowpass';
    filter.Q.setTargetAtTime(0.95, t, 0.01);
    filter.frequency.setTargetAtTime(680, t, 0.018);
    return;
  }

  holdCount = Math.max(0, holdCount - 1);
  filter.frequency.setTargetAtTime(22050, t, 0.035);
}

function runMomentaryHighPass(
  nodes: LabPerformanceNodes,
  context: AudioContext,
  phase: PerformanceEffectPhase,
): void {
  const t = context.currentTime;
  const { filter } = nodes;

  if (phase === 'hold') {
    holdCount += 1;
    filter.type = 'highpass';
    filter.Q.setTargetAtTime(0.82, t, 0.01);
    filter.frequency.setTargetAtTime(340, t, 0.015);
    return;
  }

  holdCount = Math.max(0, holdCount - 1);
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(0.7, t);
  filter.frequency.setTargetAtTime(22050, t, 0.03);
}

function runReverbThrow(nodes: LabPerformanceNodes, context: AudioContext): void {
  const t = context.currentTime;
  const { throwSend, throwConvolver, throwReturn } = nodes;

  // Plate reads faster than hall for throws; boost return so the burst is obvious over dry.
  throwConvolver.buffer = getLabImpulseResponse(context, 'plate', 2.6, 1.35);

  throwReturn.gain.cancelScheduledValues(t);
  throwReturn.gain.setValueAtTime(1.55, t);
  throwReturn.gain.setValueAtTime(1.1, t + 3.8);

  throwSend.gain.cancelScheduledValues(t);
  throwSend.gain.setValueAtTime(0, t);
  throwSend.gain.linearRampToValueAtTime(1.35, t + 0.018);
  throwSend.gain.setValueAtTime(1.35, t + 0.22);
  throwSend.gain.exponentialRampToValueAtTime(0.001, t + 3.9);
}

/** Fire a Phase C performance effect on the mirror playback graph. */
export function runPerformanceEffect(options: RunPerformanceEffectOptions): boolean {
  const { mirrorAudio, mainAudio, mainVolume, keepMirrorAudible, effectId, phase } = options;

  if (phase === 'release' && effectId !== 'momentary-lowpass' && effectId !== 'momentary-highpass') {
    return false;
  }

  const graph = ensurePlaybackGraph(mirrorAudio, mainAudio);
  const { performance: nodes, context } = graph;

  if (phase === 'trigger') {
    resetLabPerformanceNodes(nodes, context);
  }

  switch (effectId) {
    case 'filter-sweep-short':
      if (phase !== 'trigger') return false;
      runFilterSweep(nodes, context, 'short');
      break;
    case 'filter-sweep-long':
      if (phase !== 'trigger') return false;
      runFilterSweep(nodes, context, 'long');
      break;
    case 'momentary-lowpass':
      runMomentaryLowPass(nodes, context, phase);
      break;
    case 'momentary-highpass':
      runMomentaryHighPass(nodes, context, phase);
      break;
    case 'reverb-throw':
      if (phase !== 'trigger') return false;
      runReverbThrow(nodes, context);
      break;
    default:
      return false;
  }

  if (phase === 'release') {
    maybeRestoreMainPath(mainAudio, mainVolume, keepMirrorAudible);
  } else if (
    phase === 'trigger' &&
    effectId !== 'momentary-lowpass' &&
    effectId !== 'momentary-highpass'
  ) {
    const restoreMs = performanceEffectRestoreMs(effectId);
    window.setTimeout(() => {
      resetLabPerformanceNodes(nodes, context);
      maybeRestoreMainPath(mainAudio, mainVolume, keepMirrorAudible);
    }, restoreMs);
  }

  return true;
}

/** Test helper — reset module hold state between tests. */
export function resetPerformanceEffectHoldState(): void {
  holdCount = 0;
}
