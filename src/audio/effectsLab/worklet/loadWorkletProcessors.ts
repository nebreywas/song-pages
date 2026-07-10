import type { LabEffectId } from '../types';

export type WorkletProcessorId =
  | 'tape-wow-flutter'
  | 'alive-harmonic-exciter'
  | 'punch-transient-emphasis';

/** Resolved at runtime — avoids executing worklet modules under Node test imports. */
const MODULE_URL: Record<WorkletProcessorId, string> = {
  'tape-wow-flutter': new URL('../tape/tapeWowFlutterProcessor.js', import.meta.url).href,
  'alive-harmonic-exciter': new URL('./aliveHarmonicProcessor.js', import.meta.url).href,
  'punch-transient-emphasis': new URL('./punchTransientProcessor.js', import.meta.url).href,
};

const LOADED = new WeakMap<AudioContext, Set<WorkletProcessorId>>();

export function getWorkletProcessorForPreset(effectId: LabEffectId): WorkletProcessorId | null {
  switch (effectId) {
    case 'tape':
      return 'tape-wow-flutter';
    case 'alive':
      return 'alive-harmonic-exciter';
    case 'punch':
      return 'punch-transient-emphasis';
    default:
      return null;
  }
}

export function presetSupportsWorkletEnhance(effectId: LabEffectId): boolean {
  return getWorkletProcessorForPreset(effectId) !== null;
}

/** Default depth when worklet enhance is enabled — tuned per processor character. */
export function defaultWorkletEnhanceDepth(processorId: WorkletProcessorId): number {
  switch (processorId) {
    case 'tape-wow-flutter':
      return 0.82;
    case 'alive-harmonic-exciter':
      return 0.68;
    case 'punch-transient-emphasis':
      return 0.72;
    default:
      return 0.8;
  }
}

export async function loadWorkletProcessor(
  context: AudioContext,
  processorId: WorkletProcessorId,
): Promise<boolean> {
  let loaded = LOADED.get(context);
  if (!loaded) {
    loaded = new Set();
    LOADED.set(context, loaded);
  }
  if (loaded.has(processorId)) return true;

  try {
    await context.audioWorklet.addModule(MODULE_URL[processorId]);
    loaded.add(processorId);
    return true;
  } catch (error) {
    console.warn(`[effects-lab/worklet] failed to load ${processorId}`, error);
    return false;
  }
}
