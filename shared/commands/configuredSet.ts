import { applyCommandBindingPatch } from './assignments';
import {
  canRemoveCommandFromConfig,
  canReassignConfiguredCommand,
  commandIdForPresetId,
  commandIdForSurfaceDesignId,
  listRequiredBuiltinCommandIds,
  presetIdFromCommandId,
  surfaceDesignIdFromCommandId,
} from './bindingPolicy';
import { getBuiltinCommand } from './catalog';
import { BUILTIN_COMMAND_CATALOG } from './catalog';
import {
  createReserveKudoSlotCommandId,
  isReserveKudoSlotCommandId,
  isReserveKudoSlotTemplateId,
  linkedPresetLabelForReserveSlot,
  listReserveKudoSlotCommandIds,
  reserveKudoSlotDefinition,
  syncReservedKudoKeysFromSlots,
} from './kudoReserve';
import { EXTENDED_FUNCTION_KEYS, normalizeExtendedFunctionKey } from './extendedKeys';
import { GATED_KEY_POOL, normalizeGatedKey, parseReservedBindingKey, reservedBindingKey } from './gatedKeys';
import { listEnabledSafeDirectBindings } from './safeHotkeys';
import type { SurfaceDesignCatalogRow } from './surfaceCommands';
import type { CommandBindingSlot, CommandDefinition, CommandInputSource, CommandMappingState } from './types';
import { resolveBindingToCommand } from './resolve';

export type ConfiguredActionRow = {
  commandId: string;
  label: string;
  category: string;
  description?: string;
  slot: CommandBindingSlot;
  requiredInConfig: boolean;
  /** When set, a Kudo preset is linked to this reserve placeholder's key(s). */
  linkedKudoPresetName?: string;
  isReserveKudoPlaceholder?: boolean;
};

export function slotHasBindings(slot: CommandBindingSlot | undefined): boolean {
  if (!slot) return false;
  return Boolean(slot.direct || slot.gated || slot.extendedFunction);
}

export function getBindingSlotForCommand(
  state: CommandMappingState,
  commandId: string,
): CommandBindingSlot {
  const presetId = presetIdFromCommandId(commandId);
  if (presetId) return state.kudoPresetBindings[presetId] ?? {};
  const designId = surfaceDesignIdFromCommandId(commandId);
  if (designId) return state.surfaceDesignBindings[designId] ?? {};
  return state.commands[commandId] ?? {};
}

function bindingPoolForSource(source: Exclude<CommandInputSource, 'controller-ui' | 'gated'> | 'gated'): string[] {
  if (source === 'direct') return listEnabledSafeDirectBindings();
  if (source === 'gated') return [...GATED_KEY_POOL];
  return [...EXTENDED_FUNCTION_KEYS];
}

function slotFieldForSource(
  source: Exclude<CommandInputSource, 'controller-ui'>,
): keyof CommandBindingSlot {
  return source === 'extended-function' ? 'extendedFunction' : source;
}

function bindingsMatchInPool(
  source: Exclude<CommandInputSource, 'controller-ui'>,
  left: string,
  right: string,
): boolean {
  if (source === 'direct') return left.toLowerCase() === right.toLowerCase();
  if (source === 'gated') return normalizeGatedKey(left) === normalizeGatedKey(right);
  const leftNorm = normalizeExtendedFunctionKey(left);
  const rightNorm = normalizeExtendedFunctionKey(right);
  return leftNorm != null && leftNorm === rightNorm;
}

/** True when any command or Kudo reserve slot already owns this binding. */
function isBindingTaken(
  state: CommandMappingState,
  source: Exclude<CommandInputSource, 'controller-ui'>,
  binding: string,
): boolean {
  if (resolveBindingToCommand(state, source, binding)) return true;

  const field = slotFieldForSource(source);
  for (const commandId of listReserveKudoSlotCommandIds(state)) {
    const held = state.commands[commandId]?.[field];
    if (held && bindingsMatchInPool(source, held, binding)) return true;
  }
  return false;
}

/** Keys in a layer that are not assigned to any command yet. */
export function listAvailableKeysForSource(
  state: CommandMappingState,
  source: Exclude<CommandInputSource, 'controller-ui'>,
): string[] {
  const pool = bindingPoolForSource(source);
  return pool.filter((binding) => !isBindingTaken(state, source, binding));
}

/**
 * Dropdown options for one binding layer — unassigned keys plus this row's current value
 * so hosts can keep or change a binding without picking a key already used elsewhere.
 */
export function listBindingOptionsForCommand(
  state: CommandMappingState,
  commandId: string,
  source: Exclude<CommandInputSource, 'controller-ui'>,
): string[] {
  const slot = getBindingSlotForCommand(state, commandId);
  const current = slot[slotFieldForSource(source)];
  const available = listAvailableKeysForSource(state, source);
  if (!current) return available;
  if (available.some((binding) => bindingsMatchInPool(source, binding, current))) {
    return available;
  }
  return [current, ...available];
}

export function listConfiguredActionRows(
  state: CommandMappingState,
  kudoPresets: Array<{ id: string; name: string }> = [],
  surfaceDesigns: SurfaceDesignCatalogRow[] = [],
): ConfiguredActionRow[] {
  const rows: ConfiguredActionRow[] = [];

  for (const commandId of state.configuredCommandIds) {
    if (isReserveKudoSlotCommandId(commandId)) {
      const slot = state.commands[commandId] ?? {};
      const linkedKudoPresetName = linkedPresetLabelForReserveSlot(state, slot, kudoPresets);
      rows.push({
        commandId,
        label: 'Reserve for Kudos',
        category: 'kudos',
        description: reserveKudoSlotDefinition(commandId).description,
        slot,
        requiredInConfig: false,
        linkedKudoPresetName: linkedKudoPresetName ?? undefined,
        isReserveKudoPlaceholder: true,
      });
      continue;
    }

    const builtin = BUILTIN_COMMAND_CATALOG.find((row) => row.id === commandId);
    if (!builtin || isReserveKudoSlotTemplateId(commandId)) continue;
    rows.push({
      commandId,
      label: builtin.label,
      category: builtin.category,
      description: builtin.description,
      slot: state.commands[commandId] ?? {},
      requiredInConfig: Boolean(builtin.bindingPolicy?.requiredInConfig),
    });
  }

  for (const presetId of state.configuredKudoPresetIds) {
    const preset = kudoPresets.find((row) => row.id === presetId);
    if (!preset) continue;
    const commandId = commandIdForPresetId(presetId);
    rows.push({
      commandId,
      label: `Kudo: ${preset.name}`,
      category: 'kudos',
      slot: state.kudoPresetBindings[presetId] ?? {},
      requiredInConfig: false,
    });
  }

  for (const designId of state.configuredSurfaceDesignIds) {
    const design = surfaceDesigns.find((row) => row.id === designId);
    if (!design) continue;
    const commandId = commandIdForSurfaceDesignId(designId);
    rows.push({
      commandId,
      label: `Surface: ${design.name}`,
      category: 'surfaces',
      description: 'Switch the active VC control surface to this saved design.',
      slot: state.surfaceDesignBindings[designId] ?? {},
      requiredInConfig: false,
    });
  }

  return rows;
}

export function listUnassignedCatalogActions(
  state: CommandMappingState,
  catalog: CommandDefinition[],
): CommandDefinition[] {
  const configured = new Set([
    ...state.configuredCommandIds.filter((id) => !isReserveKudoSlotCommandId(id)),
    ...state.configuredKudoPresetIds.map((presetId) => commandIdForPresetId(presetId)),
    ...state.configuredSurfaceDesignIds.map((designId) => commandIdForSurfaceDesignId(designId)),
  ]);
  return catalog.filter((row) => {
    if (isReserveKudoSlotTemplateId(row.id)) return true;
    return !configured.has(row.id);
  });
}

function ensureRequiredCommands(state: CommandMappingState): CommandMappingState {
  const configured = new Set(state.configuredCommandIds);
  for (const commandId of listRequiredBuiltinCommandIds()) configured.add(commandId);
  return { ...state, configuredCommandIds: [...configured] };
}

export function addCommandToConfiguredSet(
  state: CommandMappingState,
  commandId: string,
): CommandMappingState {
  if (isReserveKudoSlotTemplateId(commandId)) {
    return addCommandToConfiguredSet(state, createReserveKudoSlotCommandId());
  }

  const presetId = presetIdFromCommandId(commandId);
  if (presetId) {
    if (state.configuredKudoPresetIds.includes(presetId)) return state;
    return {
      ...state,
      configuredKudoPresetIds: [...state.configuredKudoPresetIds, presetId],
      kudoPresetBindings: {
        ...state.kudoPresetBindings,
        [presetId]: state.kudoPresetBindings[presetId] ?? {},
      },
    };
  }

  const designId = surfaceDesignIdFromCommandId(commandId);
  if (designId) {
    if (state.configuredSurfaceDesignIds.includes(designId)) return state;
    return {
      ...state,
      configuredSurfaceDesignIds: [...state.configuredSurfaceDesignIds, designId],
      surfaceDesignBindings: {
        ...state.surfaceDesignBindings,
        [designId]: state.surfaceDesignBindings[designId] ?? {},
      },
    };
  }

  if (state.configuredCommandIds.includes(commandId)) return state;
  let next = ensureRequiredCommands({
    ...state,
    configuredCommandIds: [...state.configuredCommandIds, commandId],
    commands: {
      ...state.commands,
      [commandId]: state.commands[commandId] ?? {},
    },
  });
  if (isReserveKudoSlotCommandId(commandId)) {
    next = syncReservedKudoKeysFromSlots(next);
  }
  return next;
}

function clearReservationsForBindings(
  state: CommandMappingState,
  bindings: Array<{ source: Exclude<CommandInputSource, 'controller-ui'>; binding: string }>,
): CommandMappingState {
  let next = state;
  for (const row of bindings) {
    const key = reservedBindingKey(row.source, row.binding);
    if (!next.reservedKudoKeys.includes(key)) continue;
    const kudoPresetByReservedKey = { ...next.kudoPresetByReservedKey };
    delete kudoPresetByReservedKey[key];
    next = {
      ...next,
      reservedKudoKeys: next.reservedKudoKeys.filter((reserved) => reserved !== key),
      kudoPresetByReservedKey,
    };
  }
  return next;
}

export function removeCommandFromConfiguredSet(
  state: CommandMappingState,
  commandId: string,
  kudoPresets: Array<{ id: string; name: string }> = [],
  surfaceDesigns: SurfaceDesignCatalogRow[] = [],
): CommandMappingState {
  if (!canRemoveCommandFromConfig(commandId, kudoPresets, surfaceDesigns)) return state;

  const presetId = presetIdFromCommandId(commandId);
  const designId = surfaceDesignIdFromCommandId(commandId);
  const slot = getBindingSlotForCommand(state, commandId);
  const bindingsToClear: Array<{ source: Exclude<CommandInputSource, 'controller-ui'>; binding: string }> = [];
  if (slot.direct) bindingsToClear.push({ source: 'direct', binding: slot.direct });
  if (slot.gated) bindingsToClear.push({ source: 'gated', binding: slot.gated });
  if (slot.extendedFunction) {
    bindingsToClear.push({ source: 'extended-function', binding: slot.extendedFunction });
  }

  let next = clearReservationsForBindings(state, bindingsToClear);

  if (presetId) {
    const kudoPresetBindings = { ...next.kudoPresetBindings };
    delete kudoPresetBindings[presetId];
    return {
      ...next,
      configuredKudoPresetIds: next.configuredKudoPresetIds.filter((id) => id !== presetId),
      kudoPresetBindings,
    };
  }

  if (designId) {
    const surfaceDesignBindings = { ...next.surfaceDesignBindings };
    delete surfaceDesignBindings[designId];
    return {
      ...next,
      configuredSurfaceDesignIds: next.configuredSurfaceDesignIds.filter((id) => id !== designId),
      surfaceDesignBindings,
    };
  }

  const commands = { ...next.commands };
  delete commands[commandId];
  next = ensureRequiredCommands({
    ...next,
    configuredCommandIds: next.configuredCommandIds.filter((id) => id !== commandId),
    commands,
  });
  return isReserveKudoSlotCommandId(commandId) ? syncReservedKudoKeysFromSlots(next) : next;
}

function applyRequiredBindingPolicies(state: CommandMappingState): CommandMappingState {
  const commands = { ...state.commands };

  for (const commandId of listRequiredBuiltinCommandIds()) {
    const policy = getBuiltinCommand(commandId)?.bindingPolicy;
    if (!policy) continue;

    const current: CommandBindingSlot = { ...(commands[commandId] ?? {}) };
    if (policy.defaultBindings) {
      Object.assign(current, { ...policy.defaultBindings, ...current });
    }

    for (const field of ['direct', 'gated', 'extendedFunction'] as const) {
      if (policy.lockedBindings?.[field] && policy.defaultBindings?.[field]) {
        current[field] = policy.defaultBindings[field];
      }
    }

    commands[commandId] = current;
  }

  return { ...state, commands };
}

export function reassignConfiguredCommand(
  state: CommandMappingState,
  fromCommandId: string,
  toCommandId: string,
  kudoPresets: Array<{ id: string; name: string }> = [],
  surfaceDesigns: SurfaceDesignCatalogRow[] = [],
): CommandMappingState {
  if (fromCommandId === toCommandId) return state;
  if (!canReassignConfiguredCommand(fromCommandId)) return state;
  const slot = getBindingSlotForCommand(state, fromCommandId);
  let next = removeCommandFromConfiguredSet(state, fromCommandId, kudoPresets, surfaceDesigns);
  next = addCommandToConfiguredSet(next, toCommandId);

  const patch: Partial<CommandBindingSlot> = { ...slot };
  return applyCommandBindingPatch(next, toCommandId, patch);
}

export function pruneConfiguredState(state: CommandMappingState): CommandMappingState {
  const configuredCommandIds = [
    ...new Set([...state.configuredCommandIds, ...listRequiredBuiltinCommandIds()]),
  ].filter((commandId) => Boolean(getBuiltinCommand(commandId)));
  const configuredKudoPresetIds = [...new Set(state.configuredKudoPresetIds)];
  const configuredSurfaceDesignIds = [...new Set(state.configuredSurfaceDesignIds ?? [])];

  const commands: CommandMappingState['commands'] = {};
  for (const commandId of configuredCommandIds) {
    if (state.commands[commandId]) commands[commandId] = state.commands[commandId];
    else commands[commandId] = {};
  }

  const kudoPresetBindings: CommandMappingState['kudoPresetBindings'] = {};
  for (const presetId of configuredKudoPresetIds) {
    if (state.kudoPresetBindings[presetId]) kudoPresetBindings[presetId] = state.kudoPresetBindings[presetId];
    else kudoPresetBindings[presetId] = {};
  }

  const surfaceDesignBindings: CommandMappingState['surfaceDesignBindings'] = {};
  for (const designId of configuredSurfaceDesignIds) {
    if (state.surfaceDesignBindings?.[designId]) {
      surfaceDesignBindings[designId] = state.surfaceDesignBindings[designId];
    } else {
      surfaceDesignBindings[designId] = {};
    }
  }

  const reservedKudoKeys = state.reservedKudoKeys.filter((reservedKey) => {
    const parsed = parseReservedBindingKey(reservedKey);
    if (!parsed) return false;
    return Boolean(resolveBindingToCommand(state, parsed.source, parsed.binding));
  });

  const kudoPresetByReservedKey: Record<string, string> = {};
  for (const key of reservedKudoKeys) {
    const presetId = state.kudoPresetByReservedKey[key];
    if (presetId) kudoPresetByReservedKey[key] = presetId;
  }

  return syncReservedKudoKeysFromSlots(
    applyRequiredBindingPolicies({
      ...state,
      configuredCommandIds,
      configuredKudoPresetIds,
      configuredSurfaceDesignIds,
      commands,
      kudoPresetBindings,
      surfaceDesignBindings,
      reservedKudoKeys,
      kudoPresetByReservedKey,
    }),
  );
}

export function inferLegacyConfiguredCommandIds(
  rawCommands: Record<string, unknown> | undefined,
  factoryCommandIds: string[],
): string[] {
  const ids = new Set<string>(factoryCommandIds);
  if (rawCommands) {
    for (const commandId of Object.keys(rawCommands)) ids.add(commandId);
  }
  for (const commandId of listRequiredBuiltinCommandIds()) ids.add(commandId);
  return [...ids];
}
