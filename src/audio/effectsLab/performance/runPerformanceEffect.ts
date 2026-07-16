/**
 * Phase C performance effects — filter sweeps, momentary low-pass, reverb throw.
 * Target is whichever element owns audible output (main mirror, or VC window audio).
 */
import {
  getOrCreatePlaybackGraph,
  resumeAudioContext,
} from '../../graph/registry';
import { tryPlayMirror } from '../../hooks/mirrorPlayback';
import type { AudioGraph } from '../../types';
import { getLabImpulseResponse } from '../spatial/impulseResponse';
import { resetLabPerformanceNodes, type LabPerformanceNodes } from './labPerformanceNodes';
import {
  cancelPlaybackRateBurst,
  rateBurstKindFromEffectId,
  runPlaybackRateBurst,
} from './rateBurst';
import type {
  FilterSweepLength,
  PerformanceEffectId,
  PerformanceEffectPhase,
} from './types';
import { performanceEffectRestoreMs } from './types';

export type RunPerformanceEffectOptions = {
  /** Element that receives the Web Audio performance insert (mirror or VC audio). */
  targetAudio: HTMLAudioElement;
  /**
   * Optional element to duck while the effect runs (main native player only).
   * Omit when the target already IS the audible capture stream (VC).
   */
  duckAudio?: HTMLAudioElement | null;
  /** Volume to restore on duckAudio when the effect ends. */
  duckRestoreVolume?: number;
  /** When true, leave duckAudio muted after the effect (whole-song FX still active). */
  keepDuckMuted?: boolean;
  /** Speaker gain on the target graph (1 for main mirror; VC uses stream volume). */
  speakerGain?: number;
  /** Optional seek alignment source (usually the timing authority). */
  syncFromAudio?: HTMLAudioElement | null;
  effectId: PerformanceEffectId;
  phase: PerformanceEffectPhase;
  /** Notify host so dry mirror stay routed for the effect window (main path only). */
  onRouteActiveChange?: (active: boolean) => void;
  /**
   * Steady rate hold to restore after a rate burst (defaults to the element rate).
   * Keep this in sync with Effects Lab `playbackRateHold`.
   */
  restorePlaybackRate?: number;
};

let holdCount = 0;
let restoreTimer: ReturnType<typeof window.setTimeout> | null = null;
let routeActive = false;

function setRouteActive(
  active: boolean,
  onRouteActiveChange?: (active: boolean) => void,
): void {
  if (routeActive === active) return;
  routeActive = active;
  onRouteActiveChange?.(active);
}

function clearRestoreTimer(): void {
  if (restoreTimer != null) {
    window.clearTimeout(restoreTimer);
    restoreTimer = null;
  }
}

function ensurePlaybackGraph(
  targetAudio: HTMLAudioElement,
  options: {
    duckAudio?: HTMLAudioElement | null;
    speakerGain: number;
    syncFromAudio?: HTMLAudioElement | null;
  },
): AudioGraph {
  const { duckAudio, speakerGain, syncFromAudio } = options;
  if (duckAudio && duckAudio !== targetAudio) {
    duckAudio.volume = 0;
  }

  const syncSource = syncFromAudio && syncFromAudio !== targetAudio ? syncFromAudio : null;
  if (syncSource && Number.isFinite(syncSource.currentTime)) {
    const drift = Math.abs(targetAudio.currentTime - syncSource.currentTime);
    if (drift > 0.35) {
      try {
        targetAudio.currentTime = syncSource.currentTime;
      } catch {
        // Seeking before metadata is ready can throw — ignore.
      }
    }
  }

  const graph = getOrCreatePlaybackGraph(targetAudio);
  resumeAudioContext(graph.context);
  if (graph.speakerGain) {
    graph.speakerGain.gain.value = speakerGain;
  }
  void tryPlayMirror(targetAudio, 'performance');
  return graph;
}

function maybeRestoreDuckPath(
  duckAudio: HTMLAudioElement | null | undefined,
  duckRestoreVolume: number,
  keepDuckMuted: boolean,
  onRouteActiveChange?: (active: boolean) => void,
): void {
  if (holdCount > 0) return;
  if (!keepDuckMuted && duckAudio) {
    duckAudio.volume = duckRestoreVolume;
  }
  setRouteActive(false, onRouteActiveChange);
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

/** Fire a Phase C performance effect on the target playback graph. */
export function runPerformanceEffect(options: RunPerformanceEffectOptions): boolean {
  const {
    targetAudio,
    duckAudio = null,
    duckRestoreVolume = 1,
    keepDuckMuted = false,
    speakerGain = 1,
    syncFromAudio = null,
    effectId,
    phase,
    onRouteActiveChange,
    restorePlaybackRate,
  } = options;

  if (phase === 'release' && effectId !== 'momentary-lowpass') {
    return false;
  }

  // Coupled rate bursts — no Web Audio insert; keep timing elements in sync.
  const rateKind = rateBurstKindFromEffectId(effectId);
  if (rateKind) {
    if (phase !== 'trigger') return false;
    const audios: HTMLMediaElement[] = [targetAudio];
    if (duckAudio && duckAudio !== targetAudio) audios.push(duckAudio);
    if (syncFromAudio && !audios.includes(syncFromAudio)) audios.push(syncFromAudio);
    return runPlaybackRateBurst({
      audios,
      kind: rateKind,
      restoreRate: restorePlaybackRate ?? targetAudio.playbackRate,
    });
  }

  const graph = ensurePlaybackGraph(targetAudio, {
    duckAudio,
    speakerGain,
    syncFromAudio,
  });
  const { performance: nodes, context } = graph;

  if (phase === 'trigger' || phase === 'hold') {
    clearRestoreTimer();
    setRouteActive(true, onRouteActiveChange);
  }

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
    case 'reverb-throw':
      if (phase !== 'trigger') return false;
      runReverbThrow(nodes, context);
      break;
    default:
      return false;
  }

  if (phase === 'release') {
    maybeRestoreDuckPath(duckAudio, duckRestoreVolume, keepDuckMuted, onRouteActiveChange);
  } else if (phase === 'trigger' && effectId !== 'momentary-lowpass') {
    const restoreMs = performanceEffectRestoreMs(effectId);
    restoreTimer = window.setTimeout(() => {
      restoreTimer = null;
      resetLabPerformanceNodes(nodes, context);
      maybeRestoreDuckPath(duckAudio, duckRestoreVolume, keepDuckMuted, onRouteActiveChange);
    }, restoreMs);
  }

  return true;
}

/** Test helper — reset module hold state between tests. */
export function resetPerformanceEffectHoldState(): void {
  holdCount = 0;
  clearRestoreTimer();
  routeActive = false;
  cancelPlaybackRateBurst();
}
