import { useEffect, useMemo, useState } from 'react';

import {
  canReassignConfiguredCommand,
  canRemoveCommandFromConfig,
  COMMAND_GATE_TIMEOUT_MS_DEFAULT,
  commandLabelForConflict,
  EXTENDED_BINDING_POOL_LABEL,
  formatExtendedBindingLabel,
  getBindingSlotForCommand,
  isBindingLayerLocked,
  listBindingOptionsForCommand,
  listCatalogCommands,
  listConfiguredActionRows,
  listOverlayMappings,
  listUnassignedCatalogActions,
  type CommandBindingSlot,
  type CommandInputSource,
  type CommandMappingState,
} from '@shared/commands';
import { KUDOS_SETTINGS_KEY, migrateKudosState } from '@shared/kudos';
import {
  migrateVcSurfaceDesignCatalog,
  VC_SURFACE_DESIGNS_KEY,
} from '@shared/vcSurfaceDesigns';

import { getApp } from '../lib/bridge';
import { HelpTooltip } from '../components/HelpTooltip';
import { ActionPickerPopover } from './ActionPickerPopover';
import { CommandDisplayLabel } from './CommandDisplayLabel';
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

type BindingLayer = Exclude<CommandInputSource, 'controller-ui'>;

function TrashIcon() {
  return (
    <svg className="keybindings-remove-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M6 7h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 7Z" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

type BindingLayerSelectProps = {
  commandId: string;
  layer: BindingLayer;
  value: string | undefined;
  disabled: boolean;
  state: CommandMappingState;
  formatLabel?: (binding: string) => string;
  onChange: (patch: Partial<CommandBindingSlot>) => void;
};

/** One keybinding column — only unassigned keys plus this row's current binding. */
function BindingLayerSelect({
  commandId,
  layer,
  value,
  disabled,
  state,
  formatLabel = (binding) => binding,
  onChange,
}: BindingLayerSelectProps) {
  const options = listBindingOptionsForCommand(state, commandId, layer);
  const field = layer === 'extended-function' ? 'extendedFunction' : layer;

  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange({ [field]: e.target.value || undefined })}
    >
      <option value="">—</option>
      {options.map((binding) => (
        <option key={binding} value={binding}>
          {formatLabel(binding)}
        </option>
      ))}
    </select>
  );
}

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
  } = useCommandMappings();

  const [kudoPresets, setKudoPresets] = useState<Array<{ id: string; name: string }>>([]);
  const [surfaceDesigns, setSurfaceDesigns] = useState<Array<{ id: string; name: string }>>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [gatePreviewOpen, setGatePreviewOpen] = useState(false);
  const [reassignCommandId, setReassignCommandId] = useState<string | null>(null);
  const [sidebarPreviewId, setSidebarPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const app = getApp();
    void app?.getSettings?.(KUDOS_SETTINGS_KEY).then((raw) => {
      setKudoPresets(migrateKudosState(raw).presets.map((row) => ({ id: row.id, name: row.name })));
    });
    // Every saved VC surface becomes a bindable "switch to surface" catalog action.
    void app?.getSettings?.(VC_SURFACE_DESIGNS_KEY).then((raw) => {
      const catalog = migrateVcSurfaceDesignCatalog(raw, null);
      setSurfaceDesigns(catalog.designs.map((row) => ({ id: row.id, name: row.name })));
    });
  }, []);

  const catalog = useMemo(
    () => listCatalogCommands(kudoPresets, surfaceDesigns),
    [kudoPresets, surfaceDesigns],
  );
  const configuredRows = useMemo(
    () => listConfiguredActionRows(state, kudoPresets, surfaceDesigns),
    [state, kudoPresets, surfaceDesigns],
  );
  const unassignedActions = useMemo(
    () => listUnassignedCatalogActions(state, catalog),
    [catalog, state],
  );
  const overlayPreviewRows = useMemo(
    () => listOverlayMappings(state, kudoPresets, { vcModeActive: true }, surfaceDesigns),
    [state, kudoPresets, surfaceDesigns],
  );
  const sidebarPreview = catalog.find((row) => row.id === sidebarPreviewId) ?? null;

  const persistBinding = async (
    commandId: string,
    patch: Parameters<typeof updateCommandBinding>[1],
  ) => {
    setSaveStatus('saving');
    try {
      const result = await updateCommandBinding(commandId, patch, kudoPresets, surfaceDesigns);
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
        <div className="keybindings-toolbar-actions">
          <button type="button" className="btn" onClick={() => setGatePreviewOpen(true)}>
            Gate overlay reference…
          </button>
          <button type="button" className="btn keybindings-restore" onClick={handleRestoreDefaults}>
            Restore factory layout
          </button>
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
            <HelpTooltip ariaLabel="About gate auto-close">
              Default {COMMAND_GATE_TIMEOUT_MS_DEFAULT / 1000}s — idle timeout while the gate is open.
            </HelpTooltip>
          </div>
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

      <p className="keybindings-lead">
        Configure VC action key-bindings. Hardware keys ({EXTENDED_BINDING_POOL_LABEL}) work with Stream Deck and macro tools.
      </p>

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
                  <span>
                    <CommandDisplayLabel label={action.label} />
                  </span>
                </button>
              </li>
            ))}
            {unassignedActions.length === 0 ? (
              <li className="keybindings-muted">All catalog actions are in your setup.</li>
            ) : null}
          </ul>
          {sidebarPreview ? (
            <div className="keybindings-sidebar-about">
              <strong>
                <CommandDisplayLabel label={sidebarPreview.label} />
              </strong>
              <p>{sidebarPreview.description ?? 'No description yet.'}</p>
            </div>
          ) : null}
        </aside>

        <div className="keybindings-main">
          <div className="keybindings-table-wrap">
            <table className="keybindings-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Direct</th>
                  <th>Gated</th>
                  <th>Hardware keys</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {configuredRows.map((row) => {
                  const slot = getBindingSlotForCommand(state, row.commandId);
                  const canRemove = canRemoveCommandFromConfig(
                    row.commandId,
                    kudoPresets,
                    surfaceDesigns,
                  );
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
                            <CommandDisplayLabel label={row.label} />
                          </span>
                        </button>
                        {row.isReserveKudoPlaceholder ? (
                          <span className="keybindings-command-hint">
                            {row.linkedKudoPresetName
                              ? `Linked: ${row.linkedKudoPresetName}`
                              : 'Preset TBD — link in Kudos designer'}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <BindingLayerSelect
                          commandId={row.commandId}
                          layer="direct"
                          value={slot.direct}
                          disabled={isBindingLayerLocked(
                            row.commandId,
                            'direct',
                            kudoPresets,
                            surfaceDesigns,
                          )}
                          state={state}
                          onChange={(patch) => void persistBinding(row.commandId, patch)}
                        />
                      </td>
                      <td>
                        <BindingLayerSelect
                          commandId={row.commandId}
                          layer="gated"
                          value={slot.gated}
                          disabled={isBindingLayerLocked(
                            row.commandId,
                            'gated',
                            kudoPresets,
                            surfaceDesigns,
                          )}
                          state={state}
                          formatLabel={(key) => key.toUpperCase()}
                          onChange={(patch) => void persistBinding(row.commandId, patch)}
                        />
                      </td>
                      <td>
                        <BindingLayerSelect
                          commandId={row.commandId}
                          layer="extended-function"
                          value={slot.extendedFunction}
                          disabled={isBindingLayerLocked(
                            row.commandId,
                            'extendedFunction',
                            kudoPresets,
                            surfaceDesigns,
                          )}
                          state={state}
                          formatLabel={formatExtendedBindingLabel}
                          onChange={(patch) => void persistBinding(row.commandId, patch)}
                        />
                      </td>
                      <td>
                        {canRemove ? (
                          <button
                            type="button"
                            className="keybindings-remove"
                            aria-label={`Remove ${row.label}`}
                            onClick={() =>
                              void removeConfiguredCommand(row.commandId, kudoPresets, surfaceDesigns)
                            }
                          >
                            <TrashIcon />
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
                      No actions configured. Add one from the sidebar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {gatePreviewOpen ? (
        <div
          className="keybindings-dialog-backdrop"
          role="presentation"
          onClick={() => setGatePreviewOpen(false)}
        >
          <div
            className="keybindings-dialog panel keybindings-gate-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keybindings-gate-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="keybindings-dialog-header">
              <div>
                <h3 id="keybindings-gate-preview-title">Gate overlay reference</h3>
                <p className="keybindings-gate-preview-lead">
                  Static map of gated keys (assumes VC Mode active). Live availability appears on the VC
                  Controller while hosting.
                </p>
              </div>
              <button
                type="button"
                className="btn keybindings-dialog-close"
                onClick={() => setGatePreviewOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <GateOverlayList rows={overlayPreviewRows} variant="preview" />
          </div>
        </div>
      ) : null}

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
                void reassignCommand(reassignCommandId, command.id, kudoPresets, surfaceDesigns);
                setReassignCommandId(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
