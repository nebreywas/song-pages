/** Procedural IRs for discovery-lab convolution — no external assets. */

const IR_CACHE = new WeakMap<AudioContext, Map<string, AudioBuffer>>();

export type LabImpulseKind = 'plate' | 'hall';

function cacheKey(kind: LabImpulseKind, durationSec: number, decay: number): string {
  return `v2:${kind}:${durationSec}:${decay}`;
}

/**
 * Plate = tight early reflections (intimate room).
 * Hall = sparse, spread reflections (large space).
 */
function addEarlyReflections(
  data: Float32Array,
  sampleRate: number,
  kind: LabImpulseKind,
  decay: number,
): void {
  const tapsMs =
    kind === 'plate'
      ? [2, 4.5, 7.5, 11, 15, 20, 26]
      : [5, 14, 28, 48, 72, 98, 128, 165, 210];
  for (let t = 0; t < tapsMs.length; t += 1) {
    const idx = Math.floor((sampleRate * tapsMs[t]) / 1000);
    if (idx >= data.length) break;
    const tapDecay = (1 - idx / data.length) ** (decay * 0.35);
    const gain = kind === 'plate' ? 0.62 - t * 0.06 : 0.4 - t * 0.028;
    data[idx] += (Math.random() * 2 - 1) * gain * tapDecay;
  }
}

/** One-pole smoothed noise — plate stays darker and shorter; hall stays diffuse. */
function fillDiffuseTail(
  data: Float32Array,
  kind: LabImpulseKind,
  decay: number,
  channel: number,
): void {
  let smooth = 0;
  const smoothCoeff = kind === 'plate' ? 0.78 : 0.94;
  const width = kind === 'plate' ? 0.07 : 0.16;
  const density = kind === 'plate' ? 0.26 : 0.58;
  const stereoSign = channel === 0 ? 1 : -1;

  for (let i = 0; i < data.length; i += 1) {
    const progress = i / data.length;
    const envelope = (1 - progress) ** decay;
    const noise = Math.random() * 2 - 1;
    smooth = smooth * smoothCoeff + noise * (1 - smoothCoeff);
    data[i] += smooth * envelope * density * stereoSign * width;
  }
}

function normalizePeak(buffer: AudioBuffer, targetPeak = 0.9): void {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  if (peak <= 0) return;
  const scale = targetPeak / peak;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      data[i] *= scale;
    }
  }
}

/** Early-reflection + diffuse tail IR — plate reads intimate; hall reads large. */
export function getLabImpulseResponse(
  context: AudioContext,
  kind: LabImpulseKind,
  durationSec: number,
  decay: number,
): AudioBuffer {
  let contextCache = IR_CACHE.get(context);
  if (!contextCache) {
    contextCache = new Map();
    IR_CACHE.set(context, contextCache);
  }

  const key = cacheKey(kind, durationSec, decay);
  const cached = contextCache.get(key);
  if (cached) return cached;

  const sampleRate = context.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    addEarlyReflections(data, sampleRate, kind, decay);
    fillDiffuseTail(data, kind, decay, channel);
  }

  normalizePeak(buffer);
  contextCache.set(key, buffer);
  return buffer;
}
