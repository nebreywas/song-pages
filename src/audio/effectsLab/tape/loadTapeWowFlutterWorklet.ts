/** @deprecated Use loadWorkletProcessors.loadWorkletProcessor('tape-wow-flutter') */
import { loadWorkletProcessor } from '../worklet/loadWorkletProcessors';

const LOADED_CONTEXTS = new WeakSet<AudioContext>();

/** Load the Phase D wow/flutter worklet module once per AudioContext. */
export async function loadTapeWowFlutterWorklet(context: AudioContext): Promise<boolean> {
  if (LOADED_CONTEXTS.has(context)) return true;
  const ok = await loadWorkletProcessor(context, 'tape-wow-flutter');
  if (ok) LOADED_CONTEXTS.add(context);
  return ok;
}
