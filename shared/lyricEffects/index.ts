/**
 * Agnostic lyric presentation effects — first-class visual modes that never
 * invent lyric timing, emphasis, or section meaning.
 */

export type {
  LyricBlockPresentation,
  LyricEffectFrameInput,
  LyricEffectId,
  LyricEffectModule,
  LyricEffectSurface,
  LyricEffectTickResult,
  LyricEffectVisibleLine,
  LyricLinePresentation,
  LyricUnitPulse,
} from './types';

export { EMPTY_LYRIC_EFFECT_TICK } from './types';
export { getLyricEffect, listLyricEffects, LYRIC_EFFECT_MODULES } from './registry';
export {
  DEFAULT_LYRIC_PRESENTATION_EFFECT,
  LYRIC_EFFECT_IDS,
  LYRIC_EFFECT_LABELS,
  resolveLyricPresentationEffect,
  sanitizeLyricPresentationEffect,
} from './resolve';
export { bandEnergyFromFrequency } from './audio/energy';
export { createOnsetDetectorState, tickOnsetDetector } from './audio/onset';
export { countWords, hashString, hashUnit, splitLyricUnits } from './textUnits';
