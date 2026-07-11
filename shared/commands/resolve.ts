import { getBuiltinCommand, parseKudoPresetIdFromCommandId } from './catalog';
import { isReserveKudoSlotCommandId, linkedPresetIdForReserveSlot, listReserveKudoSlotCommandIds } from './kudoReserve';
import {
  EXTENDED_BINDING_POOL_LABEL,
  isExtendedFunctionKey,
  normalizeExtendedFunctionKey,
} from './extendedKeys';
import { isGatedKeyAllowed, normalizeGatedKey, parseReservedBindingKey } from './gatedKeys';
import { isSafeDirectBinding } from './safeHotkeys';
import type {
  CommandDefinition,
  CommandExecutionResult,
  CommandInputSource,
  CommandInvocation,
  CommandMappingState,
  CommandOverlayRow,
} from './types';

import { isCommandAvailable } from './runtimeContext';
import type { CommandRuntimeContext } from './runtimeContext';

export type ResolvedBinding = {
  commandId: string;
  source: CommandInputSource;
  binding: string;
};

/** Find which command owns a direct / gated / extended binding. */
export function resolveBindingToCommand(
  state: CommandMappingState,
  source: Exclude<CommandInputSource, 'controller-ui'>,
  binding: string,
): ResolvedBinding | null {
  const normalizedBinding =
    source === 'gated'
      ? normalizeGatedKey(binding)
      : source === 'extended-function'
        ? (normalizeExtendedFunctionKey(binding) ?? binding)
        : binding;

  for (const [commandId, slot] of Object.entries(state.commands)) {
    if (isReserveKudoSlotCommandId(commandId)) continue;
    if (source === 'direct' && slot.direct?.toLowerCase() === normalizedBinding.toLowerCase()) {
      return { commandId, source, binding: slot.direct };
    }
    if (source === 'gated' && slot.gated?.toLowerCase() === normalizedBinding) {
      return { commandId, source, binding: slot.gated };
    }
    if (source === 'extended-function' && slot.extendedFunction === normalizedBinding) {
      return { commandId, source, binding: slot.extendedFunction };
    }
  }

  // Reserved Kudo keys
  const reservedKey = `${source}:${normalizedBinding}`;
  if (state.reservedKudoKeys.includes(reservedKey)) {
    const presetId = state.kudoPresetByReservedKey[reservedKey];
    if (presetId) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: normalizedBinding };
    }
  }

  // Per-preset kudo bindings
  for (const [presetId, slot] of Object.entries(state.kudoPresetBindings)) {
    if (source === 'direct' && slot.direct?.toLowerCase() === normalizedBinding.toLowerCase()) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: slot.direct };
    }
    if (source === 'gated' && slot.gated?.toLowerCase() === normalizedBinding) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: slot.gated };
    }
    if (source === 'extended-function' && slot.extendedFunction === normalizedBinding) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: slot.extendedFunction };
    }
  }

  return null;
}

export function validateBindingAssignment(
  source: Exclude<CommandInputSource, 'controller-ui'>,
  binding: string,
): string | null {
  if (source === 'direct' && !isSafeDirectBinding(binding)) {
    return 'Binding is not in the Safe Direct pool.';
  }
  if (source === 'gated' && !isGatedKeyAllowed(binding)) {
    return 'Key is not allowed for gated commands.';
  }
  if (source === 'extended-function' && !isExtendedFunctionKey(binding)) {
    return `Hardware key must be one of: ${EXTENDED_BINDING_POOL_LABEL}.`;
  }
  return null;
}

export function findBindingConflict(
  state: CommandMappingState,
  source: Exclude<CommandInputSource, 'controller-ui'>,
  binding: string,
  exceptCommandId?: string,
): { commandId: string } | null {
  const resolved = resolveBindingToCommand(state, source, binding);
  if (!resolved) return null;
  if (exceptCommandId && resolved.commandId === exceptCommandId) return null;
  return { commandId: resolved.commandId };
}

export function evaluateInvocation(
  invocation: CommandInvocation,
  context: CommandRuntimeContext,
  kudoPresets: Array<{ id: string; name: string }> = [],
): { result: CommandExecutionResult; legacyAction?: string } {
  const presetId = parseKudoPresetIdFromCommandId(invocation.commandId);
  const command =
    presetId != null
      ? { id: invocation.commandId, label: `Kudo`, category: 'kudos', availability: { vcMode: true } }
      : getBuiltinCommand(invocation.commandId);

  if (!command) return { result: 'not-found' };
  if (!isCommandAvailable(command, context)) return { result: 'unavailable' };

  if (presetId != null) {
    const exists = kudoPresets.some((row) => row.id === presetId);
    if (!exists) return { result: 'not-found' };
    return { result: 'executed' };
  }

  return { result: 'executed', legacyAction: getBuiltinCommand(invocation.commandId)?.legacyAction };
}

export function listOverlayMappings(
  state: CommandMappingState,
  kudoPresets: Array<{ id: string; name: string }> = [],
  context: CommandRuntimeContext = { vcModeActive: true },
): CommandOverlayRow[] {
  const rows: CommandOverlayRow[] = [];

  const pushRow = (commandId: string, key: string, label: string) => {
    const builtin = getBuiltinCommand(commandId);
    const presetId = parseKudoPresetIdFromCommandId(commandId);
    const command: CommandDefinition | null =
      builtin ??
      (presetId
        ? {
            id: commandId,
            label,
            category: 'kudos',
            availability: { vcMode: true },
          }
        : null);
    if (!command) return;
    rows.push({
      key: key.toUpperCase(),
      label,
      commandId,
      available: isCommandAvailable(command, context),
    });
  };

  const seenGatedKeys = new Set<string>();

  for (const [commandId, slot] of Object.entries(state.commands)) {
    if (!slot.gated) continue;
    if (isReserveKudoSlotCommandId(commandId)) continue;
    const command = getBuiltinCommand(commandId);
    if (!command) continue;
    seenGatedKeys.add(slot.gated.toUpperCase());
    pushRow(commandId, slot.gated, command.label);
  }

  for (const commandId of listReserveKudoSlotCommandIds(state)) {
    const slot = state.commands[commandId];
    if (!slot?.gated) continue;
    const gatedKey = slot.gated.toUpperCase();
    if (seenGatedKeys.has(gatedKey)) continue;
    seenGatedKeys.add(gatedKey);

    const presetId = linkedPresetIdForReserveSlot(state, slot);
    if (presetId) {
      const preset = kudoPresets.find((row) => row.id === presetId);
      pushRow(`trigger-kudo-${presetId}`, slot.gated, `Kudo: ${preset?.name ?? presetId}`);
      continue;
    }

    rows.push({
      key: gatedKey,
      label: 'Kudo (preset TBD)',
      commandId,
      available: false,
    });
  }

  for (const [presetId, slot] of Object.entries(state.kudoPresetBindings)) {
    if (!slot.gated) continue;
    const gatedKey = slot.gated.toUpperCase();
    if (seenGatedKeys.has(gatedKey)) continue;
    seenGatedKeys.add(gatedKey);
    const preset = kudoPresets.find((row) => row.id === presetId);
    pushRow(`trigger-kudo-${presetId}`, slot.gated, `Kudo: ${preset?.name ?? presetId}`);
  }

  for (const reservedKey of state.reservedKudoKeys) {
    const parsed = parseReservedBindingKey(reservedKey);
    if (!parsed || parsed.source !== 'gated') continue;
    const gatedKey = parsed.binding.toUpperCase();
    if (seenGatedKeys.has(gatedKey)) continue;
    const presetId = state.kudoPresetByReservedKey[reservedKey];
    if (!presetId) {
      seenGatedKeys.add(gatedKey);
      rows.push({
        key: gatedKey,
        label: 'Kudo (preset TBD)',
        commandId: 'reserve-kudo-slot:orphan',
        available: false,
      });
      continue;
    }
    seenGatedKeys.add(gatedKey);
    const preset = kudoPresets.find((row) => row.id === presetId);
    pushRow(`trigger-kudo-${presetId}`, parsed.binding, `Kudo: ${preset?.name ?? presetId}`);
  }

  rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows;
}
