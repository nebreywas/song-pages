import { useMemo, useState } from 'react';

import {
  EXTENDED_BINDING_POOL_LABEL,
  listAvailableKeysForSource,
  listCatalogCommands,
  listUnassignedCatalogActions,
  type CommandInputSource,
  type CommandMappingState,
} from '@shared/commands';

import { ActionPickerPopover } from './ActionPickerPopover';

type BindingLayer = Exclude<CommandInputSource, 'controller-ui'>;

type AddKeybindingDialogProps = {
  open: boolean;
  state: CommandMappingState;
  kudoPresets: Array<{ id: string; name: string }>;
  surfaceDesigns?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onAssign: (layer: BindingLayer, binding: string, commandId: string) => void;
};

const LAYER_OPTIONS: Array<{ id: BindingLayer; label: string }> = [
  { id: 'direct', label: 'Direct' },
  { id: 'gated', label: 'Gated' },
  { id: 'extended-function', label: EXTENDED_BINDING_POOL_LABEL },
];

/**
 * Pick an unassigned key from inventory, then assign an action.
 * Retained for a possible future flow — not mounted from KeyBindingsPanel (sidebar + row dropdowns cover setup).
 */
export function AddKeybindingDialog({
  open,
  state,
  kudoPresets,
  surfaceDesigns = [],
  onClose,
  onAssign,
}: AddKeybindingDialogProps) {
  const [layer, setLayer] = useState<BindingLayer>('gated');
  const [selectedBinding, setSelectedBinding] = useState<string>('');

  const catalog = useMemo(
    () => listCatalogCommands(kudoPresets, surfaceDesigns),
    [kudoPresets, surfaceDesigns],
  );
  const actionChoices = useMemo(
    () => listUnassignedCatalogActions(state, catalog),
    [catalog, state],
  );

  const availableKeys = useMemo(
    () => listAvailableKeysForSource(state, layer),
    [layer, state],
  );

  if (!open) return null;

  const bindingLabel =
    layer === 'gated' && selectedBinding
      ? selectedBinding.toUpperCase()
      : selectedBinding;

  return (
    <div className="keybindings-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="keybindings-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-keybinding-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="keybindings-dialog-header">
          <h3 id="add-keybinding-title">Add keybinding</h3>
          <button type="button" className="btn keybindings-dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="keybindings-dialog-body">
          <div className="keybindings-dialog-step">
            <span className="keybindings-dialog-step-label">1. Input layer</span>
            <div className="keybindings-layer-tabs">
              {LAYER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`keybindings-layer-tab${layer === option.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setLayer(option.id);
                    setSelectedBinding('');
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="keybindings-dialog-step">
            <span className="keybindings-dialog-step-label">2. Available key</span>
            {availableKeys.length > 0 ? (
              <select
                value={selectedBinding}
                onChange={(e) => setSelectedBinding(e.target.value)}
              >
                <option value="">Choose a key…</option>
                {availableKeys.map((binding) => (
                  <option key={binding} value={binding}>
                    {layer === 'gated' ? binding.toUpperCase() : binding}
                  </option>
                ))}
              </select>
            ) : (
              <p className="keybindings-muted">No unassigned keys in this layer.</p>
            )}
          </div>

          <div className="keybindings-dialog-step">
            <span className="keybindings-dialog-step-label">3. Action</span>
            {selectedBinding ? (
              <ActionPickerPopover
                commands={actionChoices.length > 0 ? actionChoices : catalog}
                heading={`Assign ${bindingLabel}`}
                onAssign={(command) => {
                  onAssign(layer, selectedBinding, command.id);
                  onClose();
                }}
              />
            ) : (
              <p className="keybindings-muted">Choose a key first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
