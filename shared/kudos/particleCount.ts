import {
  KUDOS_PARTICLE_COUNT_MAX,
  KUDOS_PARTICLE_COUNT_MIN,
  KUDOS_DENSITY_DEFAULT,
} from './constants';
import type { ParticleKudoConfig } from './types';

/** Map legacy normalized density (0–1) to a particle count. */
export function densityToParticleCountLegacy(density: number): number {
  const clamped = Math.min(1, Math.max(0, density));
  return Math.round(8 + clamped * 32);
}

/** Resolve how many particles to spawn for a preset. */
export function resolveParticleCount(
  config: Pick<ParticleKudoConfig, 'particleCount' | 'density'>,
): number {
  if (typeof config.particleCount === 'number' && Number.isFinite(config.particleCount)) {
    return Math.min(
      KUDOS_PARTICLE_COUNT_MAX,
      Math.max(KUDOS_PARTICLE_COUNT_MIN, Math.round(config.particleCount)),
    );
  }

  const legacy = densityToParticleCountLegacy(
    Number.isFinite(config.density) ? config.density : KUDOS_DENSITY_DEFAULT,
  );
  return Math.min(KUDOS_PARTICLE_COUNT_MAX, Math.max(KUDOS_PARTICLE_COUNT_MIN, legacy));
}
