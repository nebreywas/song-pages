import { COMMAND_MAPPINGS_STATE_VERSION } from './constants';
import { normalizeUniqueBindings } from './assignments';
import { createDefaultCommandMappingState, listFactoryConfiguredCommandIds } from './defaults';
import { inferLegacyConfiguredCommandIds, pruneConfiguredState } from './configuredSet';
import { migrateOrphanReservedKeysToSlots, syncReservedKudoKeysFromSlots } from './kudoReserve';
import type { CommandBindingSlot, CommandMappingState } from './types';

function sanitizeBindingSlot(raw: unknown): CommandBindingSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const slot: CommandBindingSlot = {};
  if (typeof row.direct === 'string' && row.direct.trim()) slot.direct = row.direct.trim();
  if (typeof row.gated === 'string' && row.gated.trim()) slot.gated = row.gated.trim().toLowerCase();
  if (typeof row.extendedFunction === 'string' && row.extendedFunction.trim()) {
    slot.extendedFunction = row.extendedFunction.trim().toUpperCase();
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
    commands,
    reservedKudoKeys,
    kudoPresetByReservedKey,
    kudoPresetBindings,
  };

  const synced = syncReservedKudoKeysFromSlots(migrated);
  const withReserveSlots = migrateOrphanReservedKeysToSlots(synced);
  return pruneConfiguredState(normalizeUniqueBindings(withReserveSlots));
}

export function sanitizeCommandMappingStateForSave(state: CommandMappingState): CommandMappingState {
  return pruneConfiguredState(normalizeUniqueBindings(migrateCommandMappingState(state)));
}
