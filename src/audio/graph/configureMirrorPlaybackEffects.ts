import { applyLabEffectParams } from '../effectsLab/applyLabPreset';
import { bypassParams, resolveLabEffectParams } from '../effectsLab/presets';
import type { EffectsLabState, LabEffectId } from '../effectsLab/types';
import { isEffectsLabAudible, isWorkletEnhanceActive } from '../effectsLab/types';
import {
  applyLabWorkletEnhance,
  ensureWorkletEnhanceNode,
} from '../effectsLab/worklet/labWorkletEnhance';
import {
  getWorkletProcessorForPreset,
} from '../effectsLab/worklet/loadWorkletProcessors';
import type { AudioGraph } from '../types';
import {
  applyPlaybackEffects,
  getAudioGraphIfExists,
  getOrCreatePlaybackGraph,
  resumeAudioContext,
} from './registry';

export type MirrorPlaybackEffectsInput = {
  bassBoost: boolean;
  lofi: boolean;
  effectsLab?: Pick<
    EffectsLabState,
    'enabled' | 'effectId' | 'outputTrimDb' | 'abBypass' | 'workletEnhance'
  >;
};

function syncWorkletEnhance(
  graph: AudioGraph,
  effectsLab?: MirrorPlaybackEffectsInput['effectsLab'],
): void {
  if (!effectsLab || !isWorkletEnhanceActive(effectsLab as EffectsLabState)) {
    applyLabWorkletEnhance(graph.workletEnhance, null, false);
    return;
  }

  const processorId = getWorkletProcessorForPreset(effectsLab.effectId);
  if (!processorId) {
    applyLabWorkletEnhance(graph.workletEnhance, null, false);
    return;
  }

  void ensureWorkletEnhanceNode(graph, processorId).then((ready) => {
    applyLabWorkletEnhance(graph.workletEnhance, processorId, ready);
  });
}

export function isMirrorPlaybackAudible(input: MirrorPlaybackEffectsInput): boolean {
  const legacyActive = input.bassBoost || input.lofi;
  if (legacyActive) return true;
  if (!input.effectsLab) return false;
  return isEffectsLabAudible(input.effectsLab as EffectsLabState);
}

/** Apply bass / lo-fi / lab chain on a mirror element and route to speakers at `speakerGain`. */
export function configureMirrorPlaybackEffectsGraph(
  audio: HTMLAudioElement,
  input: MirrorPlaybackEffectsInput,
  options: { speakerGain: number; isPlaying?: boolean },
): AudioGraph {
  const graph = getOrCreatePlaybackGraph(audio);
  const legacyActive = input.bassBoost || input.lofi;
  const labActive = input.effectsLab
    ? isEffectsLabAudible(input.effectsLab as EffectsLabState)
    : false;

  if (legacyActive) {
    // Neutralize the lab chain first — bypassParams touches the same bass/lo-fi nodes as legacy FX.
    applyLabEffectParams(graph, bypassParams());
    applyPlaybackEffects(graph, { bassBoost: input.bassBoost, lofi: input.lofi });
    applyLabWorkletEnhance(graph.workletEnhance, null, false);
  } else if (labActive && input.effectsLab) {
    applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
    const params = resolveLabEffectParams(
      input.effectsLab.effectId as LabEffectId,
      input.effectsLab.outputTrimDb,
      input.effectsLab.abBypass,
    );
    applyLabEffectParams(graph, params);
    syncWorkletEnhance(graph, input.effectsLab);
  }

  if (graph.speakerGain) {
    graph.speakerGain.gain.value = options.speakerGain;
  }
  if (options.isPlaying) {
    resumeAudioContext(graph.context);
  }
  return graph;
}

/** Flatten FX on an existing graph — used when VC owns audible output without active presets. */
export function resetMirrorToTapGraph(audio: HTMLAudioElement, speakerGain: number): void {
  const graph = getAudioGraphIfExists(audio);
  if (!graph) return;

  graph.mode = 'tap';
  applyPlaybackEffects(graph, { bassBoost: false, lofi: false });
  applyLabEffectParams(graph, bypassParams());
  applyLabWorkletEnhance(graph.workletEnhance, null, false);
  if (graph.speakerGain) {
    graph.speakerGain.gain.value = speakerGain;
  }
}
