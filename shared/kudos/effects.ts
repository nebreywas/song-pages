/** Registered particle effect IDs (phased rollout — spec §6, §28.4). */
export const KUDO_PARTICLE_EFFECTS = [
  { id: 'rise', label: 'Rise', phase: 'A' },
  { id: 'rain', label: 'Rain', phase: 'A' },
  { id: 'burst', label: 'Burst', phase: 'A' },
  { id: 'drift', label: 'Drift', phase: 'A' },
  { id: 'fountain', label: 'Fountain', phase: 'B' },
  { id: 'swarm', label: 'Swarm', phase: 'B' },
  { id: 'scatter', label: 'Scatter', phase: 'B' },
  { id: 'spiral', label: 'Spiral', phase: 'B' },
  { id: 'wave', label: 'Wave', phase: 'C' },
  { id: 'pop', label: 'Pop', phase: 'C' },
  { id: 'pulse', label: 'Pulse', phase: 'C' },
  { id: 'comet', label: 'Comet', phase: 'C' },
] as const;

export type KudoParticleEffectId = (typeof KUDO_PARTICLE_EFFECTS)[number]['id'];

export const KUDO_PARTICLE_EFFECT_IDS = KUDO_PARTICLE_EFFECTS.map((row) => row.id);

export const KUDO_TEXT_EFFECTS = [
  { id: 'slam', label: 'Slam', phase: 'A' },
  { id: 'balloon', label: 'Balloon', phase: 'A' },
  { id: 'echo', label: 'Echo', phase: 'A' },
  { id: 'type', label: 'Type', phase: 'A' },
  { id: 'stamp', label: 'Stamp', phase: 'B' },
  { id: 'flash', label: 'Flash', phase: 'B' },
  { id: 'bounce', label: 'Bounce', phase: 'B' },
  { id: 'drop', label: 'Drop', phase: 'B' },
  { id: 'zoom', label: 'Zoom', phase: 'B' },
  { id: 'wave', label: 'Wave', phase: 'B' },
] as const;

export type KudoTextEffectId = (typeof KUDO_TEXT_EFFECTS)[number]['id'];

export const KUDO_TEXT_EFFECT_IDS = KUDO_TEXT_EFFECTS.map((row) => row.id);

export function isParticleEffectImplemented(effectId: string): boolean {
  return ['rise', 'rain', 'burst', 'drift'].includes(effectId);
}

export function isTextEffectImplemented(effectId: string): boolean {
  return ['slam', 'balloon', 'echo', 'type'].includes(effectId);
}
