/** Player Effects Lab → VC window — run performance pads on the capture stream. */
export type VcPerformanceEffectId =
  | 'filter-sweep-short'
  | 'filter-sweep-long'
  | 'momentary-lowpass'
  | 'reverb-throw'
  | 'rate-dive'
  | 'rate-climb';

export type VcPerformanceEffectPhase = 'trigger' | 'hold' | 'release';

export type VcPerformanceEffectCommand = {
  effectId: VcPerformanceEffectId;
  phase: VcPerformanceEffectPhase;
};

const VC_PERFORMANCE_EFFECT_IDS = new Set<string>([
  'filter-sweep-short',
  'filter-sweep-long',
  'momentary-lowpass',
  'reverb-throw',
  'rate-dive',
  'rate-climb',
]);

export function isVcPerformanceEffectCommand(
  value: unknown,
): value is VcPerformanceEffectCommand {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const phases = new Set(['trigger', 'hold', 'release']);
  return VC_PERFORMANCE_EFFECT_IDS.has(String(row.effectId)) && phases.has(String(row.phase));
}
