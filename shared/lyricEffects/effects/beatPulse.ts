/**
 * Beat Pulse — on detected onsets, briefly animate one on-screen word.
 * Visibility follows the lyrics view visibleRadius — no separate scroll timing.
 */

import { createOnsetDetectorState, tickOnsetDetector, type OnsetDetectorState } from '../audio/onset';
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

type BeatPulseState = {
  onset: OnsetDetectorState;
  pulses: ActivePulse[];
  recent: string[];
  pickSalt: number;
};

const PULSE_MS = 180;
const MAX_PULSES_PER_BEAT = 1;
/** Only skip the last couple of hits — avoiding a long recent list emptied the pool mid-song. */
const RECENT_CAP = 3;

function intensityAt(pulse: ActivePulse, nowMs: number): number {
  const elapsed = nowMs - pulse.startMs;
  if (elapsed < 0) return 0;
  const t = elapsed / pulse.durationMs;
  if (t >= 1) return 0;
  if (t < 0.18) return 1;
  return 1 - (t - 0.18) / 0.82;
}

export function createBeatPulseState(): BeatPulseState {
  return {
    onset: createOnsetDetectorState(),
    pulses: [],
    recent: [],
    pickSalt: 0,
  };
}

export const beatPulseLyricEffect: LyricEffectModule = {
  id: 'beat-pulse',
  label: 'Beat Pulse',
  description:
    'On audio onsets, briefly pulse one on-screen word so rhythm is felt without lyric emphasis.',
  surfaces: ['alare', 'simple-scroll'],
  createState: createBeatPulseState,
  tick(input: LyricEffectFrameInput, rawState: unknown): LyricEffectTickResult {
    const state = rawState as BeatPulseState;
    const { onset } = tickOnsetDetector(state.onset, input.frequencyData, input.nowMs, input.isPlaying);

    if (onset) {
      state.pickSalt += 1;
      const picks = pickPulseWords(
        visiblePulseWordCandidates(input),
        state.recent,
        MAX_PULSES_PER_BEAT,
        state.pickSalt ^ Math.floor(input.currentTimeSec * 10),
      );
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
