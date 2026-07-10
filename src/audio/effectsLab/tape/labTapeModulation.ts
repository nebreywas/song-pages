/** @deprecated Re-export shim — use worklet/labWorkletEnhance. */
export {
  type LabTapeModulationNodes,
  createLabTapeModulationNodes,
  ensureTapeWowFlutterNode,
  applyLabTapeModulation,
} from '../worklet/labWorkletEnhance';

export { defaultWorkletEnhanceDepth } from '../worklet/loadWorkletProcessors';

/** @deprecated Use defaultWorkletEnhanceDepth('tape-wow-flutter') */
export const TAPE_WOW_FLUTTER_DEPTH = 0.82;
