/**
 * Energy Pulse — rising-edge loudness hits light one on-screen word.
 * No long-term adaptive baseline (that went silent mid-song). Visibility is
 * whatever line set the host passes (DOM-intersecting lines).
 */

import { bandEnergyFromFrequency } from '../audio/energy';
import type {
  LyricEffectFrameInput,
  LyricEffectModule,
  LyricEffectTickResult,
  LyricLinePresentation,
  LyricUnitPulse,
} from '../types';
import { lineStillOnScreen, pickPulseWords, visiblePulseWordCandidates } from './pulseVisibility';

type ActivePulse = {
  lineId: string;
  wordIndex: number;
  startMs: number;
  durationMs: number;
};

type EnergyPulseState = {
  pulses: ActivePulse[];
  recent: string[];
  pickSalt: number;
  /** Previous frame energy — rising edge only, no song-long envelope. */
  prevEnergy: number;
  lastFireMs: number;
};

const PULSE_MS = 200;
const MAX_PULSES = 1;
const RECENT_CAP = 3;
const COOLDOWN_MS = 150;
/** Absolute rise vs last frame (IPC FFT is soft — keep reachable). */
const RISE = 0.018;
const MIN_ENERGY = 0.03;

function intensityAt(pulse: ActivePulse, nowMs: number): number {
  const elapsed = nowMs - pulse.startMs;
  if (elapsed < 0) return 0;
  const t = elapsed / pulse.durationMs;
  if (t >= 1) return 0;
  if (t < 0.18) return 1;
  return 1 - (t - 0.18) / 0.82;
}

export function createEnergyPulseState(): EnergyPulseState {
  return {
    pulses: [],
    recent: [],
    pickSalt: 0,
    prevEnergy: 0,
    lastFireMs: 0,
  };
}

export const energyPulseLyricEffect: LyricEffectModule = {
  id: 'energy-pulse',
  label: 'Energy Pulse',
  description:
    'Pulse a random on-screen word when mix level crests — Meyda-style loudness hits, not lyric meaning.',
  surfaces: ['alare', 'simple-scroll'],
  createState: createEnergyPulseState,
  tick(input: LyricEffectFrameInput, rawState: unknown): LyricEffectTickResult {
    const state = rawState as EnergyPulseState;
    const bands = bandEnergyFromFrequency(input.frequencyData);
    const energy = Math.min(1, bands.overall * 0.55 + bands.low * 0.75);
    const rise = energy - state.prevEnergy;
    // Track with a light pull so noise does not churn, but never latch to the mix level.
    state.prevEnergy = state.prevEnergy * 0.55 + energy * 0.45;

    const cooled = input.nowMs - state.lastFireMs >= COOLDOWN_MS;
    const canFire = input.isPlaying && cooled && rise >= RISE && energy > MIN_ENERGY;

    if (canFire) {
      const picks = pickPulseWords(
        visiblePulseWordCandidates(input),
        state.recent,
        MAX_PULSES,
        state.pickSalt ^ Math.floor(input.currentTimeSec * 10),
      );
      if (picks.length > 0) {
        state.lastFireMs = input.nowMs;
        state.pickSalt += 1;
        for (const pick of picks) {
          state.pulses.push({
            lineId: pick.lineId,
            wordIndex: pick.wordIndex,
            startMs: input.nowMs,
            durationMs: PULSE_MS,
          });
          state.recent.push(pick.key);
        }
        if (state.recent.length > RECENT_CAP) {
          state.recent.splice(0, state.recent.length - RECENT_CAP);
        }
      }
    }

    const live: ActivePulse[] = [];
    const byLine = new Map<string, LyricUnitPulse[]>();
    for (const pulse of state.pulses) {
      if (!lineStillOnScreen(input, pulse.lineId)) continue;
      const intensity = intensityAt(pulse, input.nowMs);
      if (intensity <= 0) continue;
      live.push(pulse);
      const list = byLine.get(pulse.lineId) ?? [];
      list.push({ unitIndex: pulse.wordIndex, kind: 'word', intensity });
      byLine.set(pulse.lineId, list);
    }
    state.pulses = live;

    const lines: Record<string, LyricLinePresentation> = {};
    for (const [lineId, pulses] of byLine) {
      lines[lineId] = { lineId, pulses };
    }
    return { block: {}, lines };
  },
};
