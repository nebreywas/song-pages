import { BUILTIN_COMMAND_CATALOG, getBuiltinCommand, getCommandDefinition, parseKudoPresetIdFromCommandId } from './catalog';
import {
  isReserveKudoSlotTemplateId,
  RESERVE_KUDO_SLOT_TEMPLATE_ID,
  reserveKudoSlotDefinition,
} from './kudoReserve';
import type { BindingSlotField } from './assignments';
import type { CommandBindingSlot, CommandDefinition } from './types';

/** Builtin commands that must always appear in host Key Bindings. */
export function listRequiredBuiltinCommandIds(): string[] {
  return BUILTIN_COMMAND_CATALOG.filter((row) => row.bindingPolicy?.requiredInConfig).map((row) => row.id);
}

export function getCommandBindingPolicy(
  commandId: string,
  kudoPresets: Array<{ id: string; name: string }> = [],
) {
  return getCommandDefinition(commandId, kudoPresets)?.bindingPolicy;
}

export function canRemoveCommandFromConfig(
  commandId: string,
  kudoPresets: Array<{ id: string; name: string }> = [],
): boolean {
  return !getCommandBindingPolicy(commandId, kudoPresets)?.requiredInConfig;
}

export function isBindingLayerLocked(
  commandId: string,
  field: BindingSlotField,
  kudoPresets: Array<{ id: string; name: string }> = [],
): boolean {
  const policy = getCommandBindingPolicy(commandId, kudoPresets);
  if (!policy?.lockedBindings) return false;
  return Boolean(policy.lockedBindings[field]);
}

export function canClearBindingLayer(
  commandId: string,
  field: BindingSlotField,
  slot: CommandBindingSlot | undefined,
  kudoPresets: Array<{ id: string; name: string }> = [],
): boolean {
  if (isBindingLayerLocked(commandId, field, kudoPresets)) return false;
  const policy = getCommandBindingPolicy(commandId, kudoPresets);
  if (!policy?.requireAtLeastOneBinding) return true;
  if (!slot) return true;
  const remaining = [slot.direct, slot.gated, slot.extendedFunction].filter(Boolean).length;
  const current = slot[field];
  if (!current) return true;
  return remaining > 1;
}

export function isCommandRequiredInConfig(commandId: string): boolean {
  return Boolean(getBuiltinCommand(commandId)?.bindingPolicy?.requiredInConfig);
}

export function canReassignConfiguredCommand(commandId: string): boolean {
  return !isCommandRequiredInConfig(commandId);
}

export function listCatalogCommands(
  kudoPresets: Array<{ id: string; name: string }> = [],
): CommandDefinition[] {
  return [
    ...BUILTIN_COMMAND_CATALOG.filter((row) => !isReserveKudoSlotTemplateId(row.id)),
    reserveKudoSlotDefinition(RESERVE_KUDO_SLOT_TEMPLATE_ID),
    ...kudoPresets.map((preset) => ({
      id: `trigger-kudo-${preset.id}`,
      label: `Kudo: ${preset.name}`,
      category: 'kudos',
      availability: { vcMode: true },
    })),
  ];
}

export function commandIdForPresetId(presetId: string): string {
  return `trigger-kudo-${presetId}`;
}

export function presetIdFromCommandId(commandId: string): string | null {
  return parseKudoPresetIdFromCommandId(commandId);
}
