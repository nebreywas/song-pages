import { MODIFIER_OCAW } from './constants';
import type { CommandDefinition } from './types';
import {
  isReserveKudoSlotCommandId,
  RESERVE_KUDO_SLOT_TEMPLATE_ID,
  reserveKudoSlotDefinition,
} from './kudoReserve';

/** Built-in commands shipped with MVP 1.0 (Kudo presets add dynamic entries). */
export const BUILTIN_COMMAND_CATALOG: CommandDefinition[] = [
  {
    id: 'toggle-cover',
    label: 'Toggle Cover',
    category: 'overlays',
    availability: { vcMode: true },
    legacyAction: 'cover',
  },
  {
    id: 'toggle-host',
    label: 'Toggle Host Graphic Display',
    category: 'overlays',
    availability: { vcMode: true },
    legacyAction: 'host',
  },
  {
    id: 'toggle-next-overlay',
    label: 'Toggle Next',
    description: 'Show or hide the next-song overlay on the VC surface.',
    category: 'overlays',
    availability: { vcMode: true },
    legacyAction: 'next',
  },
  {
    id: 'toggle-remaining',
    label: 'Toggle Remaining',
    category: 'overlays',
    availability: { vcMode: true },
    legacyAction: 'remaining',
  },
  {
    id: 'toggle-song-info',
    label: 'Toggle Song Info',
    category: 'overlays',
    availability: { vcMode: true },
    legacyAction: 'songInfo',
  },
  {
    id: 'toggle-upcoming',
    label: 'Toggle Upcoming',
    category: 'overlays',
    availability: { vcMode: true },
    legacyAction: 'upcoming',
  },
  {
    id: 'toggle-layout-mode',
    label: 'Toggle Layout Mode',
    category: 'vc-surface',
    availability: { vcMode: true },
    legacyAction: 'layoutMode',
  },
  {
    id: 'alare-speed-up',
    label: 'ALARE Speed Up',
    category: 'lyrics',
    availability: { vcMode: true },
    legacyAction: 'alareSpeedUp',
  },
  {
    id: 'alare-speed-down',
    label: 'ALARE Speed Down',
    category: 'lyrics',
    availability: { vcMode: true },
    legacyAction: 'alareSpeedDown',
  },
  {
    id: 'alare-speed-reset',
    label: 'ALARE Speed Reset',
    category: 'lyrics',
    availability: { vcMode: true },
    legacyAction: 'alareSpeedReset',
  },
  {
    id: 'change-visualizer',
    label: 'Change Visualizer',
    description: 'Randomize the active visualizer plugin on the VC surface.',
    category: 'vc-surface',
    availability: { vcMode: true },
    legacyAction: 'changeVisualizer',
  },
  {
    id: 'seek-back-500',
    label: 'Back up 500ms',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'seek-back-1s',
    label: 'Back up 1 second',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'seek-back-2s',
    label: 'Back up 2 seconds',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'seek-back-5s',
    label: 'Back up 5 seconds',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'stutter-500',
    label: 'Stutter 500ms',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'stutter-1000',
    label: 'Stutter 1 second',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'stutter-1500',
    label: 'Stutter 1.5 seconds',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'stutter-2000',
    label: 'Stutter 2 seconds',
    category: 'playback',
    availability: { vcMode: true, requiresCurrentSong: true },
  },
  {
    id: 'play-next-song',
    label: 'Play Next Song',
    description: 'Skip the between-song pause and start the next track.',
    category: 'playback',
    availability: { vcMode: true, requiresSpecialPlayPause: true },
  },
  {
    id: 'toggle-vc-command-gate',
    label: 'Toggle VC Command Gate',
    description: 'Open or close the one-shot gated command overlay.',
    category: 'vc-surface',
    availability: { vcMode: true },
    bindingPolicy: {
      requiredInConfig: true,
      requireAtLeastOneBinding: true,
      lockedBindings: { direct: true },
      defaultBindings: { direct: `${MODIFIER_OCAW}+g` },
    },
  },
  reserveKudoSlotDefinition(RESERVE_KUDO_SLOT_TEMPLATE_ID),
];

const BUILTIN_BY_ID = new Map(BUILTIN_COMMAND_CATALOG.map((row) => [row.id, row]));

export function getBuiltinCommand(commandId: string): CommandDefinition | undefined {
  if (isReserveKudoSlotCommandId(commandId)) {
    return reserveKudoSlotDefinition(commandId);
  }
  return BUILTIN_BY_ID.get(commandId);
}

export function kudoCommandIdForPreset(presetId: string): string {
  return `trigger-kudo-${presetId}`;
}

export function parseKudoPresetIdFromCommandId(commandId: string): string | null {
  const prefix = 'trigger-kudo-';
  if (!commandId.startsWith(prefix)) return null;
  const presetId = commandId.slice(prefix.length);
  return presetId.length > 0 ? presetId : null;
}

export function kudoCommandDefinition(presetId: string, presetName: string): CommandDefinition {
  return {
    id: kudoCommandIdForPreset(presetId),
    label: `Kudo: ${presetName}`,
    category: 'kudos',
    availability: { vcMode: true },
  };
}

export function listCommandsWithKudos(
  kudoPresets: Array<{ id: string; name: string }>,
): CommandDefinition[] {
  return [
    ...BUILTIN_COMMAND_CATALOG,
    ...kudoPresets.map((preset) => kudoCommandDefinition(preset.id, preset.name)),
  ];
}

export function getCommandDefinition(
  commandId: string,
  kudoPresets: Array<{ id: string; name: string }> = [],
): CommandDefinition | undefined {
  if (isReserveKudoSlotCommandId(commandId)) {
    return reserveKudoSlotDefinition(commandId);
  }
  const builtin = getBuiltinCommand(commandId);
  if (builtin) return builtin;
  const presetId = parseKudoPresetIdFromCommandId(commandId);
  if (!presetId) return undefined;
  const preset = kudoPresets.find((row) => row.id === presetId);
  if (!preset) return undefined;
  return kudoCommandDefinition(preset.id, preset.name);
}
