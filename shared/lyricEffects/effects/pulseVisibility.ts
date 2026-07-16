/**
 * Shared helpers for Beat / Energy Pulse.
 * Host passes only on-screen lines (DOM intersection). Every on-screen word is
 * an equal candidate — no center/bottom bias from index focusDistance.
 */

import { countWords, hashUnit } from '../textUnits';
import type { LyricEffectFrameInput } from '../types';

export type PulseWordCandidate = {
  lineId: string;
  wordIndex: number;
  key: string;
};

/** Every word on every host-provided (on-screen) line — equal footing. */
export function visiblePulseWordCandidates(input: LyricEffectFrameInput): PulseWordCandidate[] {
  const out: PulseWordCandidate[] = [];
  for (const line of input.lines) {
    if (!line.text.trim()) continue;
    const n = countWords(line.text);
    for (let w = 0; w < n; w += 1) {
      out.push({
        lineId: line.id,
        wordIndex: w,
        key: `${line.id}:${w}`,
      });
    }
  }
  return out;
}

/**
 * Uniform pick among on-screen words. A tiny recent list only avoids immediate
 * repeats — it must never shrink the pool down to one preferred “band.”
 */
export function pickPulseWords(
  candidates: PulseWordCandidate[],
  recent: string[],
  count: number,
  salt: number,
): PulseWordCandidate[] {
  if (candidates.length === 0 || count <= 0) return [];
  const recentSet = new Set(recent);
  const fresh = candidates.filter((c) => !recentSet.has(c.key));
  const pool = fresh.length > 0 ? fresh : candidates;

  // Hash-only ranking — no focusDistance, so top and bottom of the viewport are equal.
  const ranked = pool
    .map((c, i) => ({ c, rank: hashUnit(c.key, salt + i) }))
    .sort((a, b) => a.rank - b.rank);

  return ranked.slice(0, Math.min(count, ranked.length)).map((r) => r.c);
}

/** True while the host still includes this line in the on-screen set. */
export function lineStillOnScreen(input: LyricEffectFrameInput, lineId: string): boolean {
  return input.lines.some((entry) => entry.id === lineId);
}
