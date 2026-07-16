/**
 * Bass / mid / treble share from AnalyserNode byte-frequency bins.
 * Pure helper used by Meyda meters visualizer, Butterchurn drive, lyric pulse.
 */

import { bandEnergyFromFrequency } from '../../../shared/lyricEffects/audio/energy';

export type MeterBandShares = {
  bassShare: number;
  midShare: number;
  trebleShare: number;
  /** Mean energy 0–1 — RMS-like stand-in from FFT. */
  overall: number;
  low: number;
  mid: number;
  high: number;
};

/** Map FFT magnitudes into normalized band shares (sums to ~1 when signal exists). */
export function meterSharesFromFrequency(data: Uint8Array | null | undefined): MeterBandShares {
  const e = bandEnergyFromFrequency(data);
  const total = e.low + e.mid + e.high;
  if (total <= 1e-9) {
    return {
      bassShare: 0,
      midShare: 0,
      trebleShare: 0,
      overall: 0,
      low: 0,
      mid: 0,
      high: 0,
    };
  }
  return {
    bassShare: e.low / total,
    midShare: e.mid / total,
    trebleShare: e.high / total,
    overall: e.overall,
    low: e.low,
    mid: e.mid,
    high: e.high,
  };
}
