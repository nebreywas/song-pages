import { applyCommandBindingPatch } from './assignments';
import type { BindingSlotField } from './assignments';
import { addCommandToConfiguredSet } from './configuredSet';
import { parseReservedBindingKey, reservedBindingKey } from './gatedKeys';
import type { CommandBindingSlot, CommandDefinition, CommandMappingState } from './types';

/** Catalog template id — adding this creates a new slot instance row. */
export const RESERVE_KUDO_SLOT_TEMPLATE_ID = 'reserve-kudo-slot';

const SLOT_PREFIX = `${RESERVE_KUDO_SLOT_TEMPLATE_ID}:`;

export function isReserveKudoSlotTemplateId(commandId: string): boolean {
  return commandId === RESERVE_KUDO_SLOT_TEMPLATE_ID;
}

export function isReserveKudoSlotCommandId(commandId: string): boolean {
  return commandId.startsWith(SLOT_PREFIX) && commandId.length > SLOT_PREFIX.length;
}

export function createReserveKudoSlotCommandId(): string {
  return `${SLOT_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function reserveKudoSlotDefinition(commandId: string): CommandDefinition {
  return {
    id: commandId,
    label: 'Reserve for Kudos',
    description:
      'Hold a key for a Kudo preset you have not chosen yet. Assign the key here, then link a preset in the Kudos designer when ready.',
    category: 'kudos',
    availability: { vcMode: true },
  };
}

export function listReserveKudoSlotCommandIds(state: CommandMappingState): string[] {
  return state.configuredCommandIds.filter((commandId) => isReserveKudoSlotCommandId(commandId));
}

/** Keep reservedKudoKeys in sync with placeholder slot bindings. */
export function syncReservedKudoKeysFromSlots(state: CommandMappingState): CommandMappingState {
  const reservedKudoKeys: string[] = [];

  for (const commandId of listReserveKudoSlotCommandIds(state)) {
    const slot = state.commands[commandId];
    if (!slot) continue;
    if (slot.direct) reservedKudoKeys.push(reservedBindingKey('direct', slot.direct));
    if (slot.gated) reservedKudoKeys.push(reservedBindingKey('gated', slot.gated));
    if (slot.extendedFunction) {
      reservedKudoKeys.push(reservedBindingKey('extended-function', slot.extendedFunction));
    }
  }

  const kudoPresetByReservedKey: Record<string, string> = {};
  for (const key of reservedKudoKeys) {
    const presetId = state.kudoPresetByReservedKey[key];
    if (presetId) kudoPresetByReservedKey[key] = presetId;
  }

  return {
    ...state,
    reservedKudoKeys,
    kudoPresetByReservedKey,
  };
}

function reservedKeysForSlot(slot: CommandBindingSlot): string[] {
  const keys: string[] = [];
  if (slot.direct) keys.push(reservedBindingKey('direct', slot.direct));
  if (slot.gated) keys.push(reservedBindingKey('gated', slot.gated));
  if (slot.extendedFunction) {
    keys.push(reservedBindingKey('extended-function', slot.extendedFunction));
  }
  return keys;
}

export function linkedPresetIdForReserveSlot(
  state: CommandMappingState,
  slot: CommandBindingSlot,
): string | null {
  for (const key of reservedKeysForSlot(slot)) {
    const presetId = state.kudoPresetByReservedKey[key];
    if (presetId) return presetId;
  }
  return null;
}

export function linkedPresetLabelForReserveSlot(
  state: CommandMappingState,
  slot: CommandBindingSlot,
  kudoPresets: Array<{ id: string; name: string }>,
): string | null {
  const presetId = linkedPresetIdForReserveSlot(state, slot);
  if (!presetId) return null;
  const preset = kudoPresets.find((row) => row.id === presetId);
  return preset?.name ?? presetId;
}

function bindingFieldForReservedSource(
  source: 'direct' | 'gated' | 'extended-function',
): BindingSlotField {
  if (source === 'direct') return 'direct';
  if (source === 'gated') return 'gated';
  return 'extendedFunction';
}

/**
 * Legacy saves may list reserved keys without placeholder rows — materialize slots so
 * the configured-set UI and sync logic stay consistent.
 */
export function migrateOrphanReservedKeysToSlots(state: CommandMappingState): CommandMappingState {
  let next = syncReservedKudoKeysFromSlots(state);
  const keysFromSlots = new Set(next.reservedKudoKeys);

  for (const reservedKey of state.reservedKudoKeys) {
    if (keysFromSlots.has(reservedKey)) continue;

    const parsed = parseReservedBindingKey(reservedKey);
    if (!parsed) continue;

    const slotId = createReserveKudoSlotCommandId();
    next = addCommandToConfiguredSet(next, slotId);
    next = applyCommandBindingPatch(next, slotId, {
      [bindingFieldForReservedSource(parsed.source)]: parsed.binding,
    });
    keysFromSlots.add(reservedKey);
  }

  return syncReservedKudoKeysFromSlots(next);
}
