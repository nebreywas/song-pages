import { MODIFIER_OCAW } from './constants';
import type { CommandMappingState } from './types';

const FACTORY_COMMAND_IDS = [
  'toggle-cover',
  'toggle-host',
  'toggle-next-overlay',
  'toggle-remaining',
  'toggle-song-info',
  'toggle-upcoming',
  'toggle-layout-mode',
  'alare-speed-up',
  'alare-speed-down',
  'alare-speed-reset',
  'change-visualizer',
  'toggle-vc-command-gate',
  'play-next-song',
] as const;

/** Factory-default command bindings shipped with MVP 1.0. */
export function createDefaultCommandMappingState(): CommandMappingState {
  const O = MODIFIER_OCAW;
  return {
    version: 2,
    gateTimeoutMs: 8000,
    configuredCommandIds: [...FACTORY_COMMAND_IDS],
    configuredKudoPresetIds: [],
    configuredSurfaceDesignIds: [],
    commands: {
      'toggle-cover': { direct: `${O}+c` },
      'toggle-host': { direct: `${O}+f` },
      'toggle-next-overlay': { direct: `${O}+n` },
      'toggle-remaining': { direct: `${O}+r` },
      'toggle-song-info': { direct: `${O}+s` },
      'toggle-upcoming': { direct: `${O}+u` },
      'toggle-layout-mode': { direct: `${O}+l` },
      'alare-speed-up': { direct: `${O}+=` },
      'alare-speed-down': { direct: `${O}+-` },
      'alare-speed-reset': { direct: `${O}+0` },
      'change-visualizer': { direct: `${O}+v` },
      'toggle-vc-command-gate': { direct: `${O}+g` },
      'play-next-song': { direct: `${O}+.` },
    },
    reservedKudoKeys: [],
    kudoPresetByReservedKey: {},
    kudoPresetBindings: {},
    surfaceDesignBindings: {},
  };
}

export function listFactoryConfiguredCommandIds(): string[] {
  return [...FACTORY_COMMAND_IDS];
}
