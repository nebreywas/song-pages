import { getBuiltinCommand, parseKudoPresetIdFromCommandId } from './catalog';
import { addCommandToConfiguredSet } from './configuredSet';
import { isReserveKudoSlotCommandId, syncReservedKudoKeysFromSlots } from './kudoReserve';
import { isExtendedFunctionKey, normalizeExtendedFunctionKey } from './extendedKeys';
import { isGatedKeyAllowed, normalizeGatedKey, parseReservedBindingKey, reservedBindingKey } from './gatedKeys';
import { isSafeDirectBinding } from './safeHotkeys';
import type { CommandBindingSlot, CommandInputSource, CommandMappingState } from './types';
import { findBindingConflict, validateBindingAssignment } from './resolve';

export type BindingSlotField = keyof CommandBindingSlot;

export type BindingAssignmentConflict = {
  source: Exclude<CommandInputSource, 'controller-ui'>;
  binding: string;
  existingCommandId: string;
};

function bindingSourceForField(field: BindingSlotField): Exclude<CommandInputSource, 'controller-ui'> {
  return field === 'extendedFunction' ? 'extended-function' : field;
}

function slotFieldForSource(source: Exclude<CommandInputSource, 'controller-ui'>): BindingSlotField {
  return source === 'extended-function' ? 'extendedFunction' : source;
}

function bindingsMatch(
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

/** Human label for conflict prompts — builtin catalog or Kudo preset id. */
export function commandLabelForConflict(commandId: string): string {
  if (isReserveKudoSlotCommandId(commandId)) return 'Reserve for Kudos';
  const builtin = getBuiltinCommand(commandId);
  if (builtin) return builtin.label;
  const presetId = parseKudoPresetIdFromCommandId(commandId);
  if (presetId) return `Kudo (${presetId})`;
  return commandId;
}

/** Find reassignment conflicts introduced by a binding patch. */
export function detectBindingAssignmentConflicts(
  state: CommandMappingState,
  commandId: string,
  patch: Partial<CommandBindingSlot>,
): BindingAssignmentConflict[] {
  const conflicts: BindingAssignmentConflict[] = [];

  for (const [field, rawValue] of Object.entries(patch) as Array<[BindingSlotField, string | undefined]>) {
    if (!rawValue) continue;
    const source = bindingSourceForField(field);
    const validationError = validateBindingAssignment(source, rawValue);
    if (validationError) continue;

    const conflict = findBindingConflict(state, source, rawValue, commandId);
    if (conflict) {
      conflicts.push({ source, binding: rawValue, existingCommandId: conflict.commandId });
    }
  }

  return conflicts;
}

function clearBindingEverywhere(
  state: CommandMappingState,
  source: Exclude<CommandInputSource, 'controller-ui'>,
  binding: string,
  exceptCommandId?: string,
): CommandMappingState {
  const field = slotFieldForSource(source);
  const commands = { ...state.commands };
  const kudoPresetBindings = { ...state.kudoPresetBindings };
  let reservedKudoKeys = [...state.reservedKudoKeys];
  const kudoPresetByReservedKey = { ...state.kudoPresetByReservedKey };

  for (const [ownerId, slot] of Object.entries(commands)) {
    if (exceptCommandId && ownerId === exceptCommandId) continue;
    if (!bindingsMatch(source, slot[field] ?? '', binding)) continue;
    const nextSlot = { ...slot };
    delete nextSlot[field];
    commands[ownerId] = nextSlot;
  }

  for (const [presetId, slot] of Object.entries(kudoPresetBindings)) {
    const ownerId = `trigger-kudo-${presetId}`;
    if (exceptCommandId && ownerId === exceptCommandId) continue;
    if (!bindingsMatch(source, slot[field] ?? '', binding)) continue;
    const nextSlot = { ...slot };
    delete nextSlot[field];
    kudoPresetBindings[presetId] = nextSlot;
  }

  const reservedKey = reservedBindingKey(source, binding);
  if (reservedKudoKeys.includes(reservedKey)) {
    const ownerId = kudoPresetByReservedKey[reservedKey]
      ? `trigger-kudo-${kudoPresetByReservedKey[reservedKey]}`
      : undefined;
    if (!exceptCommandId || ownerId !== exceptCommandId) {
      reservedKudoKeys = reservedKudoKeys.filter((key) => key !== reservedKey);
      delete kudoPresetByReservedKey[reservedKey];
    }
  }

  return {
    ...state,
    commands,
    kudoPresetBindings,
    reservedKudoKeys,
    kudoPresetByReservedKey,
  };
}

function readBindingSlot(state: CommandMappingState, commandId: string): CommandBindingSlot {
  const presetId = parseKudoPresetIdFromCommandId(commandId);
  if (presetId) return state.kudoPresetBindings[presetId] ?? {};
  return state.commands[commandId] ?? {};
}

function writeBindingSlot(
  state: CommandMappingState,
  commandId: string,
  slot: CommandBindingSlot,
): CommandMappingState {
  const presetId = parseKudoPresetIdFromCommandId(commandId);
  if (presetId) {
    return addCommandToConfiguredSet(
      {
        ...state,
        kudoPresetBindings: {
          ...state.kudoPresetBindings,
          [presetId]: slot,
        },
      },
      commandId,
    );
  }
  return addCommandToConfiguredSet(
    {
      ...state,
      commands: {
        ...state.commands,
        [commandId]: slot,
      },
    },
    commandId,
  );
}

/**
 * Apply a binding patch after validation.
 * Clears the same binding from any other owner so duplicates cannot persist.
 */
export function applyCommandBindingPatch(
  state: CommandMappingState,
  commandId: string,
  patch: Partial<CommandBindingSlot>,
): CommandMappingState {
  let next = state;

  for (const [field, rawValue] of Object.entries(patch) as Array<[BindingSlotField, string | undefined]>) {
    const source = bindingSourceForField(field);

    if (!rawValue) {
      const previousBinding = readBindingSlot(next, commandId)[field];
      const slot = { ...readBindingSlot(next, commandId) };
      delete slot[field];
      next = writeBindingSlot(next, commandId, slot);
      if (previousBinding) {
        const reservedKey = reservedBindingKey(source, previousBinding);
        if (next.reservedKudoKeys.includes(reservedKey)) {
          const kudoPresetByReservedKey = { ...next.kudoPresetByReservedKey };
          delete kudoPresetByReservedKey[reservedKey];
          next = {
            ...next,
            reservedKudoKeys: next.reservedKudoKeys.filter((key) => key !== reservedKey),
            kudoPresetByReservedKey,
          };
        }
      }
      continue;
    }

    const validationError = validateBindingAssignment(source, rawValue);
    if (validationError) continue;

    const normalizedValue =
      field === 'gated'
        ? normalizeGatedKey(rawValue)
        : field === 'extendedFunction'
          ? (normalizeExtendedFunctionKey(rawValue) ?? rawValue)
          : rawValue;

    next = clearBindingEverywhere(next, source, normalizedValue, commandId);
    const slot = { ...readBindingSlot(next, commandId), [field]: normalizedValue };
    next = writeBindingSlot(next, commandId, slot);
  }

  return isReserveKudoSlotCommandId(commandId) ? syncReservedKudoKeysFromSlots(next) : next;
}

/** Drop bindings outside approved pools and resolve duplicate accelerators. */
export function normalizeUniqueBindings(state: CommandMappingState): CommandMappingState {
  let next: CommandMappingState = {
    ...state,
    commands: { ...state.commands },
    kudoPresetBindings: { ...state.kudoPresetBindings },
    reservedKudoKeys: [...state.reservedKudoKeys],
    kudoPresetByReservedKey: { ...state.kudoPresetByReservedKey },
  };

  const seen = new Set<string>();

  const keepBinding = (source: Exclude<CommandInputSource, 'controller-ui'>, binding: string | undefined) => {
    if (!binding) return false;
    const validationError = validateBindingAssignment(source, binding);
    if (validationError) return false;
    const normalized =
      source === 'direct'
        ? binding.toLowerCase()
        : source === 'gated'
          ? normalizeGatedKey(binding)
          : (normalizeExtendedFunctionKey(binding) ?? binding);
    const key = `${source}:${normalized}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  for (const [commandId, slot] of Object.entries(next.commands)) {
    const cleaned: CommandBindingSlot = { ...slot };
    if (!keepBinding('direct', cleaned.direct)) delete cleaned.direct;
    if (!keepBinding('gated', cleaned.gated)) delete cleaned.gated;
    if (!keepBinding('extended-function', cleaned.extendedFunction)) delete cleaned.extendedFunction;
    next.commands[commandId] = cleaned;
  }

  for (const [presetId, slot] of Object.entries(next.kudoPresetBindings)) {
    const cleaned: CommandBindingSlot = { ...slot };
    if (!keepBinding('direct', cleaned.direct)) delete cleaned.direct;
    if (!keepBinding('gated', cleaned.gated)) delete cleaned.gated;
    if (!keepBinding('extended-function', cleaned.extendedFunction)) delete cleaned.extendedFunction;
    next.kudoPresetBindings[presetId] = cleaned;
  }

  next.reservedKudoKeys = next.reservedKudoKeys.filter((reservedKey) => {
    const parsed = parseReservedBindingKey(reservedKey);
    if (!parsed) return false;
    if (parsed.source === 'gated' && !isGatedKeyAllowed(parsed.binding)) return false;
    if (parsed.source === 'direct' && !isSafeDirectBinding(parsed.binding)) return false;
    if (parsed.source === 'extended-function' && !isExtendedFunctionKey(parsed.binding)) return false;
    return keepBinding(parsed.source, parsed.binding);
  });

  for (const key of Object.keys(next.kudoPresetByReservedKey)) {
    if (!next.reservedKudoKeys.includes(key)) delete next.kudoPresetByReservedKey[key];
  }

  return next;
}
