import { KUDOS_DURATION_DEFAULT_MS, KUDOS_SPEED_DEFAULT, KUDOS_DENSITY_DEFAULT, KUDOS_SIZE_DEFAULT, KUDOS_VARIATION_DEFAULT, KUDOS_PARTICLE_COUNT_DEFAULT } from './constants';
import type { KudoPreset, ParticleKudoConfig, TextKudoConfig } from './types';

function particleDefaults(partial: Omit<ParticleKudoConfig, 'durationMs' | 'speed' | 'density' | 'size' | 'variation'> & Partial<Pick<ParticleKudoConfig, 'durationMs' | 'speed' | 'density' | 'size' | 'variation' | 'particleCount'>>): ParticleKudoConfig {
  return {
    durationMs: KUDOS_DURATION_DEFAULT_MS,
    speed: KUDOS_SPEED_DEFAULT,
    density: KUDOS_DENSITY_DEFAULT,
    particleCount: KUDOS_PARTICLE_COUNT_DEFAULT,
    size: KUDOS_SIZE_DEFAULT,
    variation: KUDOS_VARIATION_DEFAULT,
    assetVariantMode: 'mixed',
    iconColors: [],
    ...partial,
  };
}

/** Built-in starter presets shipped on first run (spec §18, §28.5). */
export function createStarterKudoPresets(now = Date.now()): KudoPreset[] {
  return [
    {
      id: 'starter-hearts-rise',
      name: 'Hearts Rise',
      contentType: 'builtin-assets',
      createdAt: now,
      updatedAt: now,
      particle: particleDefaults({
        elements: [{ type: 'builtin-asset', assetId: 'heart' }],
        effectId: 'rise',
        origin: 'bottom',
        durationMs: 2800,
        particleCount: 48,
        iconColorMode: 'single',
        iconColors: ['#ff6b8a'],
        assetVariantMode: 'shaded',
      }),
    },
    {
      id: 'starter-stars-burst',
      name: 'Stars Burst',
      contentType: 'builtin-assets',
      createdAt: now,
      updatedAt: now,
      particle: particleDefaults({
        elements: [{ type: 'builtin-asset', assetId: 'star' }],
        effectId: 'burst',
        origin: 'center',
        iconColorMode: 'multi',
        iconColors: ['#ffd166', '#fff4c2', '#f15bb5'],
        assetVariantMode: 'shaded',
      }),
    },
    {
      id: 'starter-sparkles-drift',
      name: 'Sparkles Drift',
      contentType: 'builtin-assets',
      createdAt: now,
      updatedAt: now,
      particle: particleDefaults({
        elements: [{ type: 'builtin-asset', assetId: 'sparkles' }],
        effectId: 'drift',
        origin: 'auto',
      }),
    },
    {
      id: 'starter-fire-rain',
      name: 'Fire Rain',
      contentType: 'emoji',
      createdAt: now,
      updatedAt: now,
      particle: particleDefaults({
        elements: [
          { type: 'emoji', value: '🔥' },
          { type: 'emoji', value: '✨' },
        ],
        effectId: 'rain',
        origin: 'top',
        particleCount: 56,
      }),
    },
    {
      id: 'starter-awesome-slam',
      name: 'Awesome!',
      contentType: 'text',
      createdAt: now,
      updatedAt: now,
      text: {
        value: 'AWESOME!',
        effectId: 'slam',
        fontId: 'impact',
        durationMs: 2400,
        textColor: '#ffffff',
        outline: 'heavy',
        shadow: 'soft',
        placement: 'center',
      },
    },
    {
      id: 'starter-love-this',
      name: 'Love This',
      contentType: 'text-emoji',
      createdAt: now,
      updatedAt: now,
      text: {
        value: 'LOVE THIS ❤️',
        effectId: 'balloon',
        fontId: 'impact',
        durationMs: 2600,
        textColor: '#ffffff',
        outline: 'heavy',
        shadow: 'soft',
        placement: 'center',
      },
    },
    {
      id: 'starter-awesome-burst',
      name: 'Awesome Burst',
      contentType: 'hybrid',
      createdAt: now,
      updatedAt: now,
      text: {
        value: 'AWESOME!',
        effectId: 'slam',
        fontId: 'impact',
        durationMs: 2600,
        textColor: '#ffffff',
        outline: 'heavy',
        shadow: 'soft',
        placement: 'center',
      },
      particle: defaultHybridParticleConfig(),
    },
  ];
}

export function defaultHybridParticleConfig(): ParticleKudoConfig {
  return particleDefaults({
    elements: [
      { type: 'builtin-asset', assetId: 'star' },
      { type: 'builtin-asset', assetId: 'sparkles' },
    ],
    effectId: 'burst',
    origin: 'center',
    particleCount: 40,
    iconColorMode: 'multi',
    iconColors: ['#ffd166', '#fff4c2', '#f15bb5'],
    assetVariantMode: 'shaded',
  });
}

export function defaultTextEmojiKudoConfig(): TextKudoConfig {
  return {
    value: 'LOVE THIS ❤️',
    effectId: 'balloon',
    fontId: 'impact',
    durationMs: 2600,
    textColor: '#ffffff',
    outline: 'heavy',
    shadow: 'soft',
    placement: 'center',
  };
}

export function defaultTextKudoConfig(): TextKudoConfig {
  return {
    value: 'AWESOME!',
    effectId: 'slam',
    fontId: 'impact',
    durationMs: 2400,
    textColor: '#ffffff',
    outline: 'light',
    shadow: 'soft',
    placement: 'center',
  };
}

export function defaultEmojiParticleConfig(): ParticleKudoConfig {
  return particleDefaults({
    elements: [{ type: 'emoji', value: '🔥' }],
    effectId: 'rise',
    origin: 'bottom',
  });
}

export function defaultParticleConfig(): ParticleKudoConfig {
  return particleDefaults({
    elements: [{ type: 'builtin-asset', assetId: 'heart' }],
    effectId: 'rise',
    origin: 'bottom',
  });
}
