/**
 * Progressive Clarity — newly visible lyrics start slightly obscured and
 * become readable while they remain on screen. Presentation only.
 */

import { hashString } from '../textUnits';
import type {
  LyricEffectFrameInput,
  LyricEffectModule,
  LyricEffectTickResult,
  LyricLinePresentation,
} from '../types';

type LineClarity = {
  firstVisibleMs: number;
};

type ProgressiveClarityState = {
  byLine: Map<string, LineClarity>;
};

const CLEAR_MS = 2200;
const START_OPACITY = 0.28;
const START_BLUR_PX = 5;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function createProgressiveClarityState(): ProgressiveClarityState {
  return { byLine: new Map() };
}

export const progressiveClarityLyricEffect: LyricEffectModule = {
  id: 'progressive-clarity',
  label: 'Progressive Clarity',
  description:
    'Newly shown lyrics begin blurred and soft, then resolve to full clarity while remaining visible.',
  surfaces: ['alare', 'simple-scroll'],
  createState: createProgressiveClarityState,
  tick(input: LyricEffectFrameInput, rawState: unknown): LyricEffectTickResult {
    const state = rawState as ProgressiveClarityState;
    const visibleIds = new Set<string>();
    const lines: Record<string, LyricLinePresentation> = {};

    for (const line of input.lines) {
      if (!line.text.trim()) continue;
      const onScreen = line.focusDistance <= input.visibleRadius;
      if (!onScreen) {
        state.byLine.delete(line.id);
        continue;
      }

      visibleIds.add(line.id);
      let entry = state.byLine.get(line.id);
      if (!entry) {
        entry = { firstVisibleMs: input.nowMs - (hashString(line.id) % 80) };
        state.byLine.set(line.id, entry);
      }

      const progress = easeOutCubic(
        Math.min(1, Math.max(0, input.nowMs - entry.firstVisibleMs) / CLEAR_MS),
      );
      if (progress >= 0.995) continue;

      const opacityMul = START_OPACITY + (1 - START_OPACITY) * progress;
      const blur = START_BLUR_PX * (1 - progress);
      lines[line.id] = {
        lineId: line.id,
        opacityMul,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      };
    }

    for (const id of [...state.byLine.keys()]) {
      if (!visibleIds.has(id)) state.byLine.delete(id);
    }

    return { block: {}, lines };
  },
};
