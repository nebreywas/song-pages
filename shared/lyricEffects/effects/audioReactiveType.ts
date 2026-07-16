/**
 * Audio-Reactive Typography — the whole visible lyric block responds subtly to
 * music energy. Layout and word identity stay stable; no per-word emphasis.
 */

import { bandEnergyFromFrequency } from '../audio/energy';
import type {
  LyricEffectFrameInput,
  LyricEffectModule,
  LyricEffectTickResult,
} from '../types';

type AudioReactiveState = {
  lowSmooth: number;
  overallSmooth: number;
};

const SMOOTH = 0.18;

export function createAudioReactiveState(): AudioReactiveState {
  return { lowSmooth: 0, overallSmooth: 0 };
}

export const audioReactiveTypeLyricEffect: LyricEffectModule = {
  id: 'audio-reactive-type',
  label: 'Audio-Reactive Type',
  description:
    'The full lyric block gently scales, tracks, and breathes with audio energy — no word-level importance.',
  surfaces: ['alare', 'simple-scroll'],
  createState: createAudioReactiveState,
  tick(input: LyricEffectFrameInput, rawState: unknown): LyricEffectTickResult {
    const state = rawState as AudioReactiveState;
    if (!input.isPlaying) {
      state.lowSmooth *= 0.9;
      state.overallSmooth *= 0.9;
    } else {
      const bands = bandEnergyFromFrequency(input.frequencyData);
      state.lowSmooth += (bands.low - state.lowSmooth) * SMOOTH;
      state.overallSmooth += (bands.overall - state.overallSmooth) * SMOOTH;
    }

    // Keep motion barely perceptible so reading stays easy.
    const scale = 1 + state.lowSmooth * 0.028;
    const tracking = state.overallSmooth * 0.035;
    const baseline = (state.lowSmooth - state.overallSmooth) * 1.6;

    return {
      block: {
        transform: `translateY(${baseline.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        letterSpacingEm: tracking,
        cssVars: {
          '--lyric-fx-energy': state.overallSmooth.toFixed(3),
          '--lyric-fx-bass': state.lowSmooth.toFixed(3),
        },
      },
      lines: {},
    };
  },
};
