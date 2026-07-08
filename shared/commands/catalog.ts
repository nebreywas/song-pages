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
    availability: { vcMode: true, requiresCoverArt: true },
    legacyAction: 'cover',
  },
  {
    id: 'toggle-host',
    label: 'Toggle Host',
    category: 'overlays',
    availability: { vcMode: true, requiresHostGraphic: true },
    legacyAction: 'host',
  },
  {
    id: 'toggle-next-overlay',
    label: 'Toggle Next',
    description: 'Show or hide the next-song overlay on the VC surface.',
    category: 'overlays',
    availability: { vcMode: true, requiresNextSong: true },
    legacyAction: 'next',
  },
  {
    id: 'toggle-remaining',
    label: 'Toggle Remaining',
    category: 'overlays',
    availability: { vcMode: true, requiresPlaybackTiming: true },
    legacyAction: 'remaining',
  },
  {
    id: 'toggle-song-info',
    label: 'Toggle Song Info',
    category: 'overlays',
    availability: { vcMode: true, requiresCurrentSong: true },
    legacyAction: 'songInfo',
  },
  {
    id: 'toggle-upcoming',
    label: 'Toggle Upcoming',
    category: 'overlays',
    availability: { vcMode: true, requiresUpcomingSongs: true },
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
    id: 'toggle-debug-outlines',
    label: 'Toggle Debug Outlines',
    category: 'vc-surface',
    availability: { vcMode: true },
    legacyAction: 'debugOutlines',
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
