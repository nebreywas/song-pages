import { COMMAND_MAPPINGS_STATE_VERSION, MODIFIER_OCAW } from './constants';
import { normalizeUniqueBindings } from './assignments';
import { createDefaultCommandMappingState, listFactoryConfiguredCommandIds } from './defaults';
import { inferLegacyConfiguredCommandIds, pruneConfiguredState } from './configuredSet';
import { normalizeExtendedFunctionKey } from './extendedKeys';
import { migrateOrphanReservedKeysToSlots, syncReservedKudoKeysFromSlots } from './kudoReserve';
import type { CommandBindingSlot, CommandMappingState } from './types';

/** Remap volume chords from broken OCAW+< / OCAW+> to registerable OCAW+, / OCAW+. */
export function migrateVolumeDirectBindings(state: CommandMappingState): CommandMappingState {
  const O = MODIFIER_OCAW;
  let next = state;

  const volumeUp = state.commands['volume-up'];
  if (volumeUp?.direct?.toLowerCase() === `${O}+<`.toLowerCase()) {
    next = {
      ...next,
      commands: {
        ...next.commands,
        'volume-up': { ...volumeUp, direct: `${O}+,` },
      },
    };
  }

  const volumeDown = state.commands['volume-down'];
  if (volumeDown?.direct?.toLowerCase() === `${O}+>`.toLowerCase()) {
    next = {
      ...next,
      commands: {
        ...next.commands,
        'volume-down': { ...volumeDown, direct: `${O}+.` },
      },
    };
  }

  return next;
}

/** OCAW+H conflicts with macOS Hide Others — remap the host overlay to OCAW+F. */
export function migrateToggleHostGraphicBinding(state: CommandMappingState): CommandMappingState {
  const slot = state.commands['toggle-host'];
  if (!slot?.direct) return state;
  if (slot.direct.toLowerCase() !== `${MODIFIER_OCAW}+h`.toLowerCase()) return state;

  return {
    ...state,
    commands: {
      ...state.commands,
      'toggle-host': {
        ...slot,
        direct: `${MODIFIER_OCAW}+f`,
      },
    },
  };
}

function sanitizeBindingSlot(raw: unknown): CommandBindingSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const slot: CommandBindingSlot = {};
  if (typeof row.direct === 'string' && row.direct.trim()) slot.direct = row.direct.trim();
  if (typeof row.gated === 'string' && row.gated.trim()) slot.gated = row.gated.trim().toLowerCase();
  if (typeof row.extendedFunction === 'string' && row.extendedFunction.trim()) {
    slot.extendedFunction =
      normalizeExtendedFunctionKey(row.extendedFunction.trim()) ?? row.extendedFunction.trim();
  }
  return Object.keys(slot).length > 0 ? slot : null;
}

export function migrateCommandMappingState(raw: unknown): CommandMappingState {
  const factory = createDefaultCommandMappingState();
  if (!raw || typeof raw !== 'object') return factory;

  const row = raw as Record<string, unknown>;
  const rawCommands =
    row.commands && typeof row.commands === 'object'
      ? (row.commands as Record<string, unknown>)
      : undefined;

  const configuredCommandIds = Array.isArray(row.configuredCommandIds)
    ? row.configuredCommandIds.filter((id): id is string => typeof id === 'string')
    : inferLegacyConfiguredCommandIds(rawCommands, listFactoryConfiguredCommandIds());

  const kudoPresetBindings: CommandMappingState['kudoPresetBindings'] = {};
  if (row.kudoPresetBindings && typeof row.kudoPresetBindings === 'object') {
    for (const [presetId, value] of Object.entries(row.kudoPresetBindings as Record<string, unknown>)) {
      const slot = sanitizeBindingSlot(value);
      if (!slot) continue;
      kudoPresetBindings[presetId] = { ...kudoPresetBindings[presetId], ...slot };
    }
  }

  const configuredKudoPresetIds = Array.isArray(row.configuredKudoPresetIds)
    ? row.configuredKudoPresetIds.filter((id): id is string => typeof id === 'string')
    : Object.keys(kudoPresetBindings);

  const surfaceDesignBindings: CommandMappingState['surfaceDesignBindings'] = {};
  if (row.surfaceDesignBindings && typeof row.surfaceDesignBindings === 'object') {
    for (const [designId, value] of Object.entries(
      row.surfaceDesignBindings as Record<string, unknown>,
    )) {
      const slot = sanitizeBindingSlot(value);
      if (!slot) continue;
      surfaceDesignBindings[designId] = { ...surfaceDesignBindings[designId], ...slot };
    }
  }

  const configuredSurfaceDesignIds = Array.isArray(row.configuredSurfaceDesignIds)
    ? row.configuredSurfaceDesignIds.filter((id): id is string => typeof id === 'string')
    : Object.keys(surfaceDesignBindings);

  const commands: CommandMappingState['commands'] = {};
  for (const commandId of configuredCommandIds) {
    const fromRaw = rawCommands ? sanitizeBindingSlot(rawCommands[commandId]) : null;
    const fromFactory = factory.commands[commandId];
    commands[commandId] = { ...fromFactory, ...fromRaw };
  }

  const reservedKudoKeys = Array.isArray(row.reservedKudoKeys)
    ? row.reservedKudoKeys.filter((key): key is string => typeof key === 'string')
    : [];

  const kudoPresetByReservedKey: Record<string, string> = {};
  if (row.kudoPresetByReservedKey && typeof row.kudoPresetByReservedKey === 'object') {
    for (const [key, presetId] of Object.entries(row.kudoPresetByReservedKey as Record<string, unknown>)) {
      if (typeof presetId === 'string' && presetId) kudoPresetByReservedKey[key] = presetId;
    }
  }

  const migrated: CommandMappingState = {
    version: COMMAND_MAPPINGS_STATE_VERSION,
    gateTimeoutMs:
      typeof row.gateTimeoutMs === 'number' && row.gateTimeoutMs >= 1000
        ? row.gateTimeoutMs === 3000
          ? factory.gateTimeoutMs
          : row.gateTimeoutMs
        : factory.gateTimeoutMs,
    configuredCommandIds,
    configuredKudoPresetIds,
    configuredSurfaceDesignIds,
    commands,
    reservedKudoKeys,
    kudoPresetByReservedKey,
    kudoPresetBindings,
    surfaceDesignBindings,
  };

  const synced = syncReservedKudoKeysFromSlots(migrated);
  const withReserveSlots = migrateOrphanReservedKeysToSlots(synced);
  const withHostBinding = migrateToggleHostGraphicBinding(withReserveSlots);
  const withVolumeBindings = migrateVolumeDirectBindings(withHostBinding);
  return pruneConfiguredState(normalizeUniqueBindings(withVolumeBindings));
}

export function sanitizeCommandMappingStateForSave(state: CommandMappingState): CommandMappingState {
  return pruneConfiguredState(normalizeUniqueBindings(migrateCommandMappingState(state)));
}
