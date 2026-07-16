/**
 * Sanitize / resolve lyric presentation effect ids for assignment overrides.
 */

import type { LyricEffectId } from './types';

export const LYRIC_EFFECT_IDS = [
  'none',
  'beat-pulse',
  'energy-pulse',
  'matrix-reveal',
  'progressive-clarity',
  'audio-reactive-type',
] as const satisfies readonly LyricEffectId[];

export const LYRIC_EFFECT_LABELS: Record<LyricEffectId, string> = {
  none: 'None',
  'beat-pulse': 'Beat Pulse',
  'energy-pulse': 'Energy Pulse',
  'matrix-reveal': 'Matrix Reveal',
  'progressive-clarity': 'Progressive Clarity',
  'audio-reactive-type': 'Audio-Reactive Type',
};

export const DEFAULT_LYRIC_PRESENTATION_EFFECT: LyricEffectId = 'none';

const ALLOWED = new Set<string>(LYRIC_EFFECT_IDS);

export function sanitizeLyricPresentationEffect(raw: unknown): LyricEffectId | undefined {
  if (typeof raw !== 'string' || !ALLOWED.has(raw)) return undefined;
  return raw as LyricEffectId;
}

export function resolveLyricPresentationEffect(raw: unknown): LyricEffectId {
  return sanitizeLyricPresentationEffect(raw) ?? DEFAULT_LYRIC_PRESENTATION_EFFECT;
}
