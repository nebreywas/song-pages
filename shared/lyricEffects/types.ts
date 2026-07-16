/**
 * Agnostic lyric presentation effects — visual interest without lyric timing,
 * emphasis, or section semantics. Effects may use only visible text structure,
 * playback clock, and audio analysis.
 */

export type LyricEffectId =
  | 'none'
  | 'beat-pulse'
  | 'energy-pulse'
  | 'matrix-reveal'
  | 'progressive-clarity'
  | 'audio-reactive-type';

export type LyricEffectSurface = 'alare' | 'simple-scroll' | 'marquee';

/** One currently rendered line — identity + text only; no “importance” metadata. */
export type LyricEffectVisibleLine = {
  id: string;
  text: string;
  index: number;
  /** Absolute distance from scroll focus in line units (0 = focused). */
  focusDistance: number;
};

export type LyricEffectFrameInput = {
  nowMs: number;
  currentTimeSec: number;
  isPlaying: boolean;
  frequencyData: Uint8Array | null;
  lines: LyricEffectVisibleLine[];
  /** Lines with focusDistance <= this count as “on screen” for reveal effects. */
  visibleRadius: number;
};

/** Temporary pulse on a word or glyph — communicates rhythm, not emphasis. */
export type LyricUnitPulse = {
  unitIndex: number;
  kind: 'word' | 'char';
  /** 1 = peak of the short animation; decays to 0. */
  intensity: number;
};

export type LyricLinePresentation = {
  lineId: string;
  /** Multiplies ALARE / host opacity — never invents semantic fade. */
  opacityMul?: number;
  filter?: string;
  transform?: string;
  /** Substituted display string (e.g. matrix scramble). */
  displayText?: string;
  pulses?: LyricUnitPulse[];
};

/** Whole visible lyric block — used by Audio-Reactive Typography. */
export type LyricBlockPresentation = {
  transform?: string;
  letterSpacingEm?: number;
  filter?: string;
  cssVars?: Record<string, string>;
};

export type LyricEffectTickResult = {
  block: LyricBlockPresentation;
  lines: Record<string, LyricLinePresentation>;
};

export type LyricEffectModule = {
  id: LyricEffectId;
  label: string;
  description: string;
  surfaces: readonly LyricEffectSurface[];
  createState: () => unknown;
  tick: (input: LyricEffectFrameInput, state: unknown) => LyricEffectTickResult;
};

export const EMPTY_LYRIC_EFFECT_TICK: LyricEffectTickResult = {
  block: {},
  lines: {},
};
