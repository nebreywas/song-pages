import type { PerformanceEffectDefinition, PerformanceEffectId } from './types';

export const PERFORMANCE_EFFECT_DEFINITIONS: PerformanceEffectDefinition[] = [
  {
    id: 'filter-sweep-short',
    label: 'Filter Sweep (short)',
    concept: 'Low-pass arc — ~3s build or breakdown gesture.',
    trigger: true,
  },
  {
    id: 'filter-sweep-long',
    label: 'Filter Sweep (long)',
    concept: 'Extended low-pass arc — ~6s slow transition.',
    trigger: true,
  },
  {
    id: 'momentary-lowpass',
    label: 'Momentary Low-Pass',
    concept: 'Hold to muffle — release to recover.',
    hold: true,
  },
  {
    id: 'reverb-throw',
    label: 'Reverb Throw',
    concept: 'Audible plate burst on the current moment — dry stays up.',
    trigger: true,
  },
  {
    id: 'rate-dive',
    label: 'Rate Dive',
    concept: 'Coupled speed+pitch slowdown burst — eases down then recovers (~2.8s).',
    trigger: true,
  },
  {
    id: 'rate-climb',
    label: 'Rate Climb',
    concept: 'Coupled speed+pitch speed-up burst — lifts then settles (~2.2s).',
    trigger: true,
  },
];

const BY_ID = new Map(PERFORMANCE_EFFECT_DEFINITIONS.map((row) => [row.id, row]));

export function getPerformanceEffectDefinition(
  id: PerformanceEffectId,
): PerformanceEffectDefinition | undefined {
  return BY_ID.get(id);
}
