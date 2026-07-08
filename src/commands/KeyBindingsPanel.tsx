import { useEffect, useMemo, useState } from 'react';

import {
  canReassignConfiguredCommand,
  canRemoveCommandFromConfig,
  COMMAND_GATE_TIMEOUT_MS_DEFAULT,
  commandLabelForConflict,
  EXTENDED_FUNCTION_KEYS,
  GATED_KEY_POOL,
  getBindingSlotForCommand,
  isBindingLayerLocked,
  listCatalogCommands,
  listConfiguredActionRows,
  listEnabledSafeDirectBindings,
  listOverlayMappings,
  listUnassignedCatalogActions,
} from '@shared/commands';
import { KUDOS_SETTINGS_KEY, migrateKudosState } from '@shared/kudos';

import { getApp } from '../lib/bridge';
import { ActionPickerPopover } from './ActionPickerPopover';
import { AddKeybindingDialog } from './AddKeybindingDialog';
import { GateOverlayList } from './GateOverlayList';
import { useCommandMappings } from './useCommandMappings';
import './actionPicker.css';
import './gateOverlay.css';
import './keyBindings.css';

const GATE_TIMEOUT_OPTIONS_MS = [4000, 6000, 8000, 12000, 15000] as const;

const REGISTRATION_FAILURE_LABELS: Record<string, string> = {
  'binding-unregistered': 'Could not register with the OS (key may be in use)',
  'duplicate-accelerator': 'Duplicate shortcut in your mapping set',
};

/** Reusable Key Bindings & Controls editor — app settings + VC designer. */
export function KeyBindingsPanel() {
  const {
    state,
    loading,
    registrationFailures,
    restoreDefaults,
    updateCommandBinding,
    updateGateTimeoutMs,
    addConfiguredCommand,
    removeConfiguredCommand,
    reassignCommand,
    assignKeyBinding,
  } = useCommandMappings();

  const [kudoPresets, setKudoPresets] = useState<Array<{ id: string; name: string }>>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [reassignCommandId, setReassignCommandId] = useState<string | null>(null);
  const [sidebarPreviewId, setSidebarPreviewId] = useState<string | null>(null);

  useEffect(() => {
    void getApp()
      ?.getSettings?.(KUDOS_SETTINGS_KEY)
      .then((raw) => {
        setKudoPresets(
          migrateKudosState(raw).presets.map((row) => ({ id: row.id, name: row.name })),
        );
      });
  }, []);

  const catalog = useMemo(() => listCatalogCommands(kudoPresets), [kudoPresets]);
  const configuredRows = useMemo(
    () => listConfiguredActionRows(state, kudoPresets),
    [state, kudoPresets],
  );
  const unassignedActions = useMemo(
    () => listUnassignedCatalogActions(state, catalog),
    [catalog, state],
  );
  const overlayPreviewRows = useMemo(
    () => listOverlayMappings(state, kudoPresets, { vcModeActive: true }),
    [state, kudoPresets],
  );
  const safeDirectOptions = useMemo(() => listEnabledSafeDirectBindings(), []);
  const sidebarPreview = catalog.find((row) => row.id === sidebarPreviewId) ?? null;

  const persistBinding = async (
    commandId: string,
    patch: Parameters<typeof updateCommandBinding>[1],
  ) => {
    setSaveStatus('saving');
    try {
      const result = await updateCommandBinding(commandId, patch, kudoPresets);
      if (result === undefined) {
        setSaveStatus('idle');
        return;
      }
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Key binding save failed', error);
      setSaveStatus('error');
    }
  };

  const handleRestoreDefaults = () => {
    void restoreDefaults();
  };

  if (loading) return <p className="keybindings-loading">Loading key bindings…</p>;

  return (
    <div className="keybindings-panel">
      <div className="keybindings-toolbar">
        <p className="keybindings-lead">
          Configure which VC actions appear in your setup and which keys trigger them. Remove actions you
          do not need, add Kudos from the catalog, or bind unassigned keys from inventory. F13–F24 work
          with Stream Deck and macro tools without the gate.
        </p>
        <div className="keybindings-toolbar-actions">
          <button type="button" className="btn" onClick={() => setAddDialogOpen(true)}>
            Add keybinding
          </button>
          <button type="button" className="btn keybindings-restore" onClick={handleRestoreDefaults}>
            Restore factory layout
          </button>
          {saveStatus === 'saving' ? <span className="keybindings-save-status">Saving…</span> : null}
          {saveStatus === 'saved' ? (
            <span className="keybindings-save-status keybindings-save-status-ok">Saved</span>
          ) : null}
          {saveStatus === 'error' ? (
            <span className="keybindings-save-status keybindings-save-status-error">Save failed</span>
          ) : null}
        </div>
      </div>

      {registrationFailures.length > 0 ? (
        <div className="keybindings-warnings" role="status">
          <strong>Some shortcuts could not be registered:</strong>
          <ul>
            {registrationFailures.map((row, index) => {
              const commandLabel = row.commandId ? commandLabelForConflict(row.commandId) : null;
              const reasonLabel = REGISTRATION_FAILURE_LABELS[row.reason] ?? row.reason;
              return (
                <li key={`${row.accelerator ?? row.commandId ?? 'row'}-${index}`}>
                  {row.accelerator ?? 'Shortcut'}
                  {commandLabel ? ` (${commandLabel})` : ''}: {reasonLabel}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="keybindings-gate-timeout">
        <label htmlFor="keybindings-gate-timeout">Gate auto-close</label>
        <select
          id="keybindings-gate-timeout"
          value={state.gateTimeoutMs}
          onChange={(e) => void updateGateTimeoutMs(Number(e.target.value))}
        >
          {GATE_TIMEOUT_OPTIONS_MS.map((ms) => (
            <option key={ms} value={ms}>
              {ms / 1000}s
            </option>
          ))}
        </select>
        <span className="keybindings-muted">
          Default {COMMAND_GATE_TIMEOUT_MS_DEFAULT / 1000}s — idle timeout while the gate is open.
        </span>
      </div>

      <div className="keybindings-layout">
        <aside className="keybindings-sidebar panel">
          <h3 className="keybindings-sidebar-title">Unassigned actions</h3>
          <p className="keybindings-sidebar-hint">
            Click to preview. Double-click to add to your setup.
          </p>
          <ul className="keybindings-sidebar-list">
            {unassignedActions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  className={`keybindings-sidebar-item${sidebarPreviewId === action.id ? ' is-selected' : ''}`}
                  onClick={() => setSidebarPreviewId(action.id)}
                  onDoubleClick={() => void addConfiguredCommand(action.id)}
                >
                  <span>{action.label}</span>
                  <span className="keybindings-sidebar-meta">{action.category}</span>
                </button>
              </li>
            ))}
            {unassignedActions.length === 0 ? (
              <li className="keybindings-muted">All catalog actions are in your setup.</li>
            ) : null}
          </ul>
          {sidebarPreview ? (
            <div className="keybindings-sidebar-about">
              <strong>{sidebarPreview.label}</strong>
              <p>{sidebarPreview.description ?? 'No description yet.'}</p>
            </div>
          ) : null}
        </aside>

        <div className="keybindings-main">
          <div className="gate-overlay-preview-wrap">
            <p className="gate-overlay-preview-hint">
              Gate overlay preview (assumes VC Mode active). Live contextual graying appears on the VC
              Controller while hosting.
            </p>
            <GateOverlayList rows={overlayPreviewRows} variant="preview" />
          </div>

          <div className="keybindings-table-wrap">
            <table className="keybindings-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Direct (Safe)</th>
                  <th>Gated</th>
                  <th>F13–F24</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {configuredRows.map((row) => {
                  const slot = getBindingSlotForCommand(state, row.commandId);
                  const canRemove = canRemoveCommandFromConfig(row.commandId, kudoPresets);
                  const canReassign = canReassignConfiguredCommand(row.commandId);

                  return (
                    <tr key={row.commandId}>
                      <td>
                        <button
                          type="button"
                          className="keybindings-action-button"
                          onClick={() => canReassign && setReassignCommandId(row.commandId)}
                          disabled={!canReassign}
                          title={canReassign ? 'Change action' : 'Required action — cannot reassign'}
                        >
                          <span className="keybindings-command-label">
                            {row.requiredInConfig ? '🔒 ' : ''}
                            {row.label}
                          </span>
                        </button>
                        {row.isReserveKudoPlaceholder ? (
                          <span className="keybindings-command-hint">
                            {row.linkedKudoPresetName
                              ? `Linked: ${row.linkedKudoPresetName}`
                              : 'Preset TBD — link in Kudos designer'}
                          </span>
                        ) : null}
                        <span className="keybindings-command-id">{row.commandId}</span>
                      </td>
                      <td>
                        <select
                          value={slot.direct ?? ''}
                          disabled={isBindingLayerLocked(row.commandId, 'direct', kudoPresets)}
                          onChange={(e) =>
                            void persistBinding(row.commandId, {
                              direct: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">—</option>
                          {safeDirectOptions.map((binding) => (
                            <option key={binding} value={binding}>
                              {binding}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={slot.gated ?? ''}
                          disabled={isBindingLayerLocked(row.commandId, 'gated', kudoPresets)}
                          onChange={(e) =>
                            void persistBinding(row.commandId, {
                              gated: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">—</option>
                          {GATED_KEY_POOL.map((key) => (
                            <option key={key} value={key}>
                              {key.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={slot.extendedFunction ?? ''}
                          disabled={isBindingLayerLocked(row.commandId, 'extendedFunction', kudoPresets)}
                          onChange={(e) =>
                            void persistBinding(row.commandId, {
                              extendedFunction: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">—</option>
                          {EXTENDED_FUNCTION_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {key}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {canRemove ? (
                          <button
                            type="button"
                            className="btn keybindings-remove"
                            aria-label={`Remove ${row.label}`}
                            onClick={() => void removeConfiguredCommand(row.commandId, kudoPresets)}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="keybindings-muted" title="Required action">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {configuredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="keybindings-muted">
                      No actions configured. Add one from the sidebar or bind a key.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddKeybindingDialog
        open={addDialogOpen}
        state={state}
        kudoPresets={kudoPresets}
        onClose={() => setAddDialogOpen(false)}
        onAssign={(layer, binding, commandId) => {
          void assignKeyBinding(layer, binding, commandId, kudoPresets);
        }}
      />

      {reassignCommandId ? (
        <div className="keybindings-dialog-backdrop" role="presentation" onClick={() => setReassignCommandId(null)}>
          <div
            className="keybindings-dialog panel"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="keybindings-dialog-header">
              <h3>Change action</h3>
              <button
                type="button"
                className="btn keybindings-dialog-close"
                onClick={() => setReassignCommandId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <ActionPickerPopover
              commands={catalog.filter((row) => row.id !== reassignCommandId)}
              onAssign={(command) => {
                void reassignCommand(reassignCommandId, command.id, kudoPresets);
                setReassignCommandId(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
