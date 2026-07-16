import type { LyricEffectModule, LyricEffectTickResult } from '../types';
import { EMPTY_LYRIC_EFFECT_TICK } from '../types';

/** Identity effect — no visual mutation. */
export const noneLyricEffect: LyricEffectModule = {
  id: 'none',
  label: 'None',
  description: 'Plain lyric presentation with no agnostic effects.',
  surfaces: ['alare', 'simple-scroll', 'marquee'],
  createState: () => null,
  tick: () => EMPTY_LYRIC_EFFECT_TICK,
};
