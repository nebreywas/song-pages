/**
 * Registry of agnostic lyric presentation effects.
 * Add/remove modules here without touching ALARE timeline or future timed lyrics.
 */

import { audioReactiveTypeLyricEffect } from './effects/audioReactiveType';
import { beatPulseLyricEffect } from './effects/beatPulse';
import { energyPulseLyricEffect } from './effects/energyPulse';
import { matrixRevealLyricEffect } from './effects/matrixReveal';
import { noneLyricEffect } from './effects/none';
import { progressiveClarityLyricEffect } from './effects/progressiveClarity';
import type { LyricEffectId, LyricEffectModule } from './types';

export const LYRIC_EFFECT_MODULES: readonly LyricEffectModule[] = [
  noneLyricEffect,
  beatPulseLyricEffect,
  energyPulseLyricEffect,
  matrixRevealLyricEffect,
  progressiveClarityLyricEffect,
  audioReactiveTypeLyricEffect,
];

const BY_ID = new Map<LyricEffectId, LyricEffectModule>(
  LYRIC_EFFECT_MODULES.map((mod) => [mod.id, mod]),
);

export function getLyricEffect(id: LyricEffectId): LyricEffectModule {
  return BY_ID.get(id) ?? noneLyricEffect;
}

export function listLyricEffects(): readonly LyricEffectModule[] {
  return LYRIC_EFFECT_MODULES;
}
