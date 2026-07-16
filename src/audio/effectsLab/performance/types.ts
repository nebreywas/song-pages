/** Phase C — momentary / triggered graph effects (discovery lab). */

export type PerformanceEffectId =
  | 'filter-sweep-short'
  | 'filter-sweep-long'
  | 'momentary-lowpass'
  | 'reverb-throw'
  | 'rate-dive'
  | 'rate-climb';

export type PerformanceEffectPhase = 'trigger' | 'hold' | 'release';

export type PerformanceEffectDefinition = {
  id: PerformanceEffectId;
  label: string;
  concept: string;
  /** Click to fire once. */
  trigger?: boolean;
  /** Pointer hold / release. */
  hold?: boolean;
};

export type FilterSweepLength = 'short' | 'long';

/** Restore timing after one-shot performance effects (ms). */
export function performanceEffectRestoreMs(effectId: PerformanceEffectId): number {
  switch (effectId) {
    case 'filter-sweep-short':
      return 3400;
    case 'filter-sweep-long':
      return 6200;
    case 'reverb-throw':
      return 4200;
    case 'rate-dive':
      return 450 + 900 + 1400;
    case 'rate-climb':
      return 350 + 700 + 1200;
    default:
      return 0;
  }
}
