/**
 * Lightweight band energy from byte-frequency FFT — pure, allocation-light.
 * Does not claim beat detection; Beat Pulse uses {@link ./onset.ts}.
 */

export type BandEnergy = {
  /** Rough low band (kick / bass region for typical music). */
  low: number;
  mid: number;
  high: number;
  /** Mean of all bins, 0..1. */
  overall: number;
};

const EMPTY: BandEnergy = { low: 0, mid: 0, high: 0, overall: 0 };

/** Normalize 0–255 FFT magnitudes into low / mid / high buckets. */
export function bandEnergyFromFrequency(data: Uint8Array | null | undefined): BandEnergy {
  if (!data || data.length === 0) return EMPTY;

  const n = data.length;
  const lowEnd = Math.max(1, Math.floor(n * 0.08));
  const midEnd = Math.max(lowEnd + 1, Math.floor(n * 0.35));

  let lowSum = 0;
  let midSum = 0;
  let highSum = 0;
  let total = 0;

  for (let i = 0; i < n; i += 1) {
    const v = (data[i] ?? 0) / 255;
    total += v;
    if (i < lowEnd) lowSum += v;
    else if (i < midEnd) midSum += v;
    else highSum += v;
  }

  return {
    low: lowSum / lowEnd,
    mid: midSum / Math.max(1, midEnd - lowEnd),
    high: highSum / Math.max(1, n - midEnd),
    overall: total / n,
  };
}
