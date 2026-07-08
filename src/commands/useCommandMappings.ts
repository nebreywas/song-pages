import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addCommandToConfiguredSet,
  applyCommandBindingPatch,
  canClearBindingLayer,
  commandLabelForConflict,
  createDefaultCommandMappingState,
  detectBindingAssignmentConflicts,
  getBindingSlotForCommand,
  migrateCommandMappingState,
  reassignConfiguredCommand,
  removeCommandFromConfiguredSet,
  sanitizeCommandMappingStateForSave,
  validateBindingAssignment,
  type CommandBindingSlot,
  type CommandInputSource,
  type CommandMappingState,
} from '@shared/commands';

import { getApp } from '../lib/bridge';

export function useCommandMappings() {
  const [state, setState] = useState<CommandMappingState>(() => migrateCommandMappingState(null));
  const stateRef = useRef(state);
  const [loading, setLoading] = useState(true);
  const [registrationFailures, setRegistrationFailures] = useState<
    Array<{ accelerator?: string; commandId?: string; reason: string }>
  >([]);

  stateRef.current = state;

  const applyServerState = useCallback((raw: CommandMappingState | null | undefined) => {
    const migrated = migrateCommandMappingState(raw ?? null);
    stateRef.current = migrated;
    setState(migrated);
    return migrated;
  }, []);

  const reloadFromServer = useCallback(async () => {
    const result = await getApp()?.commands?.getState?.();
    if (result?.ok && result.data) {
      return applyServerState(result.data);
    }
    return stateRef.current;
  }, [applyServerState]);

  useEffect(() => {
    const app = getApp();
    const commands = app?.commands;
    if (!commands?.getState) {
      setLoading(false);
      return;
    }

    void reloadFromServer().finally(() => setLoading(false));

    const offMapping = commands.onMappingState?.((next) => {
      applyServerState(next);
    });
    const offRegistration = commands.onRegistrationStatus?.((payload) => {
      setRegistrationFailures(payload.failures ?? []);
    });

    return () => {
      offMapping?.();
      offRegistration?.();
    };
  }, [applyServerState, reloadFromServer]);

  const saveState = useCallback(
    async (updater: CommandMappingState | ((current: CommandMappingState) => CommandMappingState)) => {
      const current = stateRef.current;
      const next = typeof updater === 'function' ? updater(current) : updater;
      const normalized = sanitizeCommandMappingStateForSave(next);
      applyServerState(normalized);

      const app = getApp();
      if (!app?.commands?.saveState) {
        window.alert('Key bindings cannot be saved in this window. Use the Song Pages desktop app.');
        return normalized;
      }

      const result = await app.commands.saveState(normalized);
      if (!result?.ok) {
        console.error('Failed to save command mappings', result?.error);
        window.alert(
          result?.error
            ? `Could not save key bindings: ${result.error}`
            : 'Could not save key bindings. Your changes may not persist after restart.',
        );
        return normalized;
      }

      if (result.data) {
        return applyServerState(result.data);
      }

      return reloadFromServer();
    },
    [applyServerState, reloadFromServer],
  );

  const updateCommandBinding = useCallback(
    async (
      commandId: string,
      patch: Partial<CommandBindingSlot>,
      kudoPresets: Array<{ id: string; name: string }> = [],
    ) => {
      for (const [field, value] of Object.entries(patch) as Array<
        [keyof CommandBindingSlot, string | undefined]
      >) {
        if (value) {
          const source = field === 'extendedFunction' ? 'extended-function' : field;
          const validationError = validateBindingAssignment(source, value);
          if (validationError) {
            window.alert(validationError);
            return;
          }
          continue;
        }

        if (
          !canClearBindingLayer(
            commandId,
            field,
            getBindingSlotForCommand(stateRef.current, commandId),
            kudoPresets,
          )
        ) {
          window.alert('This binding is required and cannot be cleared.');
          return;
        }
      }

      const conflicts = detectBindingAssignmentConflicts(stateRef.current, commandId, patch);
      if (conflicts.length > 0) {
        const targetLabel = commandLabelForConflict(commandId);
        const lines = conflicts.map((row) => {
          const bindingLabel =
            row.source === 'gated' ? row.binding.toUpperCase() : row.binding;
          return `${bindingLabel} → ${commandLabelForConflict(row.existingCommandId)}`;
        });
        const confirmed = window.confirm(
          `Reassign binding${conflicts.length > 1 ? 's' : ''} to ${targetLabel}?\n\nCurrently assigned:\n${lines.join('\n')}`,
        );
        if (!confirmed) return;
      }

      return saveState((current) => applyCommandBindingPatch(current, commandId, patch));
    },
    [saveState],
  );

  const addConfiguredCommand = useCallback(
    async (commandId: string) => saveState((current) => addCommandToConfiguredSet(current, commandId)),
    [saveState],
  );

  const removeConfiguredCommand = useCallback(
    async (commandId: string, kudoPresets: Array<{ id: string; name: string }> = []) => {
      if (!window.confirm('Remove this action from your key bindings? All of its assigned keys will be cleared.')) {
        return;
      }
      return saveState((current) => removeCommandFromConfiguredSet(current, commandId, kudoPresets));
    },
    [saveState],
  );

  const reassignCommand = useCallback(
    async (
      fromCommandId: string,
      toCommandId: string,
      kudoPresets: Array<{ id: string; name: string }> = [],
    ) => {
      return saveState((current) => reassignConfiguredCommand(current, fromCommandId, toCommandId, kudoPresets));
    },
    [saveState],
  );

  const assignKeyBinding = useCallback(
    async (
      layer: Exclude<CommandInputSource, 'controller-ui'>,
      binding: string,
      commandId: string,
      kudoPresets: Array<{ id: string; name: string }> = [],
    ) => {
      const field =
        layer === 'extended-function'
          ? 'extendedFunction'
          : layer === 'gated'
            ? 'gated'
            : 'direct';
      await addConfiguredCommand(commandId);
      return updateCommandBinding(commandId, { [field]: binding }, kudoPresets);
    },
    [addConfiguredCommand, updateCommandBinding],
  );

  const toggleReservedKudoKey = useCallback(
    async (reservedKey: string, enabled: boolean) => {
      return saveState((current) => {
        const reserved = new Set(current.reservedKudoKeys);
        if (enabled) reserved.add(reservedKey);
        else reserved.delete(reservedKey);
        const nextMap = { ...current.kudoPresetByReservedKey };
        if (!enabled) delete nextMap[reservedKey];
        return {
          ...current,
          reservedKudoKeys: [...reserved],
          kudoPresetByReservedKey: nextMap,
        };
      });
    },
    [saveState],
  );

  const assignKudoPresetToReservedKey = useCallback(
    async (reservedKey: string, presetId: string | null) => {
      return saveState((current) => {
        const nextMap = { ...current.kudoPresetByReservedKey };
        if (!presetId) delete nextMap[reservedKey];
        else nextMap[reservedKey] = presetId;
        return { ...current, kudoPresetByReservedKey: nextMap };
      });
    },
    [saveState],
  );

  const updateGateTimeoutMs = useCallback(
    async (gateTimeoutMs: number) => {
      return saveState((current) => ({ ...current, gateTimeoutMs }));
    },
    [saveState],
  );

  const restoreDefaults = useCallback(async () => {
    const confirmed = window.confirm(
      'Restore the factory key binding layout?\n\nThis replaces your configured actions and bindings with the default VC layout.',
    );
    if (!confirmed) return;
    return saveState(createDefaultCommandMappingState());
  }, [saveState]);

  return {
    state,
    loading,
    registrationFailures,
    saveState,
    restoreDefaults,
    updateCommandBinding,
    updateGateTimeoutMs,
    addConfiguredCommand,
    removeConfiguredCommand,
    reassignCommand,
    assignKeyBinding,
    toggleReservedKudoKey,
    assignKudoPresetToReservedKey,
  };
}
