/**
 * Matrix Reveal — new visible lines start as scrambled glyphs and resolve into
 * the real lyric text over time. Pure presentation; no vocal sync.
 */

import { hashString, hashUnit } from '../textUnits';
import type {
  LyricEffectFrameInput,
  LyricEffectModule,
  LyricEffectTickResult,
  LyricLinePresentation,
} from '../types';

type LineReveal = {
  firstVisibleMs: number;
};

type MatrixRevealState = {
  byLine: Map<string, LineReveal>;
};

/** Characters used only as visual noise — never implied “code” meaning. */
const NOISE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*+<>?/';

const REVEAL_MS = 2800;

function noiseChar(seed: string, frameSalt: number, charIndex: number): string {
  const r = hashUnit(seed, frameSalt * 97 + charIndex * 13);
  return NOISE[Math.floor(r * NOISE.length)] ?? '?';
}

/**
 * Organic resolve: early characters stabilize sooner with jitter so the reveal
 * does not read as a left-to-right typewriter.
 */
function scrambleLine(text: string, progress: number, lineId: string, nowMs: number): string {
  if (progress >= 1) return text;
  if (progress <= 0) {
    let out = '';
    const salt = Math.floor(nowMs / 50);
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i] ?? '';
      out += /\s/.test(ch) ? ch : noiseChar(lineId, salt, i);
    }
    return out;
  }

  const frameSalt = Math.floor(nowMs / 70);
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? '';
    if (/\s/.test(ch)) {
      out += ch;
      continue;
    }
    // Stable order bias + per-char jitter — organic, not mechanical.
    const orderBias = hashUnit(lineId, i) * 0.55;
    const threshold = Math.min(1, progress * 1.15 + orderBias * (1 - progress));
    const settle = hashUnit(lineId, i + 1000);
    if (settle < threshold) out += ch;
    else out += noiseChar(lineId, frameSalt, i);
  }
  return out;
}

export function createMatrixRevealState(): MatrixRevealState {
  return { byLine: new Map() };
}

export const matrixRevealLyricEffect: LyricEffectModule = {
  id: 'matrix-reveal',
  label: 'Matrix Reveal',
  description:
    'Newly visible lyric text starts scrambled and settles into the real characters while it remains on screen.',
  surfaces: ['alare', 'simple-scroll'],
  createState: createMatrixRevealState,
  tick(input: LyricEffectFrameInput, rawState: unknown): LyricEffectTickResult {
    const state = rawState as MatrixRevealState;
    const visibleIds = new Set<string>();
    const lines: Record<string, LyricLinePresentation> = {};

    for (const line of input.lines) {
      if (!line.text) continue;
      const onScreen = line.focusDistance <= input.visibleRadius;
      if (!onScreen) {
        state.byLine.delete(line.id);
        continue;
      }

      visibleIds.add(line.id);
      let reveal = state.byLine.get(line.id);
      if (!reveal) {
        // Seed from playback time so seeks reset organically without storing meaning.
        reveal = { firstVisibleMs: input.nowMs - hashString(line.id) % 120 };
        state.byLine.set(line.id, reveal);
      }

      const elapsed = Math.max(0, input.nowMs - reveal.firstVisibleMs);
      const progress = Math.min(1, elapsed / REVEAL_MS);
      if (progress >= 1) {
        // Fully resolved — leave presentation empty so DOM stays plain text.
        continue;
      }

      lines[line.id] = {
        lineId: line.id,
        displayText: scrambleLine(line.text, progress, line.id, input.nowMs),
      };
    }

    // Drop stale entries when lyrics remount / song changes mid-effect.
    for (const id of [...state.byLine.keys()]) {
      if (!visibleIds.has(id)) state.byLine.delete(id);
    }

    return { block: {}, lines };
  },
};
