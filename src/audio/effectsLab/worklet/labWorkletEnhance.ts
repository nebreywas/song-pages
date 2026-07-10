import type { AudioGraph } from '../../types';
import {
  defaultWorkletEnhanceDepth,
  loadWorkletProcessor,
  type WorkletProcessorId,
} from './loadWorkletProcessors';

export type LabWorkletEnhanceNodes = {
  input: GainNode;
  output: GainNode;
  bypass: GainNode;
  worklet: AudioWorkletNode | null;
  workletReady: boolean;
  activeProcessor: WorkletProcessorId | null;
  attachPromise: Promise<boolean> | null;
};

/** Bypass path by default — worklet attaches lazily when enhance is enabled. */
export function createLabWorkletEnhanceNodes(context: AudioContext): LabWorkletEnhanceNodes {
  const input = context.createGain();
  input.gain.value = 1;
  const output = context.createGain();
  output.gain.value = 1;
  const bypass = context.createGain();
  bypass.gain.value = 1;

  input.connect(bypass);
  bypass.connect(output);

  return {
    input,
    output,
    bypass,
    worklet: null,
    workletReady: false,
    activeProcessor: null,
    attachPromise: null,
  };
}

function disconnectWorklet(slot: LabWorkletEnhanceNodes): void {
  if (slot.worklet) {
    try {
      slot.input.disconnect(slot.worklet);
      slot.worklet.disconnect();
    } catch {
      // Graph may already be torn down.
    }
    slot.worklet = null;
  }
  slot.workletReady = false;
  slot.activeProcessor = null;
  slot.attachPromise = null;
}

/** Create/swap AudioWorkletNode for the requested processor. */
export async function ensureWorkletEnhanceNode(
  graph: AudioGraph,
  processorId: WorkletProcessorId,
): Promise<boolean> {
  const slot = graph.workletEnhance;

  if (slot.workletReady && slot.activeProcessor === processorId) return true;
  if (slot.attachPromise && slot.activeProcessor === processorId) return slot.attachPromise;

  disconnectWorklet(slot);

  slot.attachPromise = (async () => {
    const loaded = await loadWorkletProcessor(graph.context, processorId);
    if (!loaded) return false;

    try {
      const worklet = new AudioWorkletNode(graph.context, processorId, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        parameterData: { depth: 0 },
      });
      slot.input.connect(worklet);
      worklet.connect(slot.output);
      slot.worklet = worklet;
      slot.workletReady = true;
      slot.activeProcessor = processorId;
      return true;
    } catch (error) {
      console.warn('[effects-lab/worklet] AudioWorkletNode creation failed', error);
      return false;
    }
  })();

  return slot.attachPromise;
}

/** Toggle worklet path vs bypass — safe when worklet is not yet attached. */
export function applyLabWorkletEnhance(
  slot: LabWorkletEnhanceNodes,
  processorId: WorkletProcessorId | null,
  enabled: boolean,
): void {
  const active =
    enabled &&
    processorId !== null &&
    slot.workletReady &&
    slot.worklet &&
    slot.activeProcessor === processorId;

  slot.bypass.gain.value = active ? 0 : 1;

  const depthParam = slot.worklet?.parameters.get('depth');
  if (depthParam && processorId) {
    depthParam.value = active ? defaultWorkletEnhanceDepth(processorId) : 0;
  }
}

/** @deprecated Alias — graph field renamed workletEnhance. */
export type LabTapeModulationNodes = LabWorkletEnhanceNodes;
export const createLabTapeModulationNodes = createLabWorkletEnhanceNodes;
export const ensureTapeWowFlutterNode = async (graph: AudioGraph): Promise<boolean> =>
  ensureWorkletEnhanceNode(graph, 'tape-wow-flutter');
export const applyLabTapeModulation = (
  slot: LabWorkletEnhanceNodes,
  enabled: boolean,
  depth?: number,
) => {
  applyLabWorkletEnhance(slot, enabled ? 'tape-wow-flutter' : null, enabled);
  if (depth !== undefined && slot.worklet) {
    const depthParam = slot.worklet.parameters.get('depth');
    if (depthParam && enabled) depthParam.value = depth;
  }
};
