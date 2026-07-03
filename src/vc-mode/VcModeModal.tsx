/**
 * VC Mode configuration — Surface → Content → Start.
 * Save Design persists without launching; Start VC launches the external surface.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { VC_TEMPLATES } from '@shared/vcSurface/templates';
import {
  bringFloatToFront,
  canAddFloat,
  createFloat,
  sendFloatToBack,
} from '@shared/vcSurface/floats';
import {
  activeAreaCount,
  allContentAssignments,
  assignVisualizerToRegion,
  configUsesHost,
  emptyCell,
  normalizeVcConfig,
  resetTemplateProportions,
  switchTemplate,
  type VcCellAssignment,
  type VcModeConfig,
  type VcStatePayload,
  type VcTemplateId,
} from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { listVisualizers, visualizerSupportsSurface } from '../visualizers/registry';
import { ContentAssignmentPanel } from './designer/ContentAssignmentPanel';
import { DesignerCanvas, type DesignerSelection } from './designer/DesignerCanvas';
import { createDefaultVcConfig, migrateVcConfig, VC_SETTINGS_KEY } from './vcModeDefaults';

type ModalStage = 'surface' | 'content' | 'start';

type VcModeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: (config: VcModeConfig) => void;
  /** Live song/artist context for designer content previews (optional). */
  previewState?: VcStatePayload | null;
};

function cellNeedsCycle(cell: VcCellAssignment): boolean {
  return cell.slotA !== '' && cell.slotB !== '';
}

function validateConfig(config: VcModeConfig): string | null {
  const normalized = normalizeVcConfig(config);
  let visualizerCount = 0;

  for (const cell of allContentAssignments(normalized)) {
    if (cell.slotA === 'visualizer') visualizerCount += 1;
    if (cell.slotB === 'visualizer') visualizerCount += 1;
    if (cellNeedsCycle(cell) && !cell.cycleTime) {
      return 'Each area with two content types needs a cycle time.';
    }
  }

  if (visualizerCount > 1) {
    return 'Only one area can use the visualizer.';
  }

  if (configUsesHost(normalized) && !normalized.hostGraphicPath) {
    return 'Pick a VC host graphic when assigning the host to an area.';
  }

  return null;
}

function localFileUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  if (filePath.startsWith('file://')) return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
}

export function VcModeModal({ open, onClose, onStart, previewState = null }: VcModeModalProps) {
  const [config, setConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const [stage, setStage] = useState<ModalStage>('surface');
  const [selection, setSelection] = useState<DesignerSelection>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const app = getApp();
    if (!app?.getSettings) return;
    void app.getSettings(VC_SETTINGS_KEY).then((saved) => {
      setConfig(migrateVcConfig(saved));
      setError(null);
      setSaveMessage(null);
      setStage('surface');
      setSelection(null);
    });
  }, [open]);

  const visualizerAssigned = useMemo(
    () =>
      allContentAssignments(config).some(
        (cell) => cell.slotA === 'visualizer' || cell.slotB === 'visualizer',
      ),
    [config],
  );

  const windowVisualizers = useMemo(
    () =>
      listVisualizers().filter(
        (p) => visualizerSupportsSurface(p, 'window') || visualizerSupportsSurface(p, 'both'),
      ),
    [],
  );

  const designerPreview = useMemo((): VcStatePayload | null => {
    const hostGraphicUrl = localFileUrl(config.hostGraphicPath);
    if (!previewState) {
      return {
        config,
        playback: { currentTime: 0, duration: 0, isPlaying: false },
        currentSong: null,
        nextSong: null,
        upcoming: [],
        hostGraphicUrl,
        artistName: null,
        artistBio: null,
        artistPhotoUrl: null,
      };
    }
    return {
      ...previewState,
      config,
      hostGraphicUrl: hostGraphicUrl ?? previewState.hostGraphicUrl,
    };
  }, [config, previewState]);

  const setSurface = useCallback((patch: Partial<VcModeConfig['surface']>) => {
    setConfig((prev) =>
      normalizeVcConfig({
        ...prev,
        surface: { ...prev.surface, ...patch },
      }),
    );
    setSaveMessage(null);
  }, []);

  const selectTemplate = (templateId: VcTemplateId) => {
    setConfig((prev) => switchTemplate(prev, templateId));
    setSelection(null);
    setSaveMessage(null);
  };

  const updateArea = (index: number, patch: Partial<VcCellAssignment>) => {
    setConfig((prev) => {
      let next = {
        ...prev,
        cells: prev.cells.map((cell, i) => (i === index ? { ...cell, ...patch } : cell)),
      };
      if (patch.slotA === 'visualizer' || patch.slotB === 'visualizer') {
        next = assignVisualizerToRegion(
          next,
          { kind: 'area', index },
          patch.slotA === 'visualizer' ? 'slotA' : 'slotB',
        );
      }
      const cell = next.cells[index];
      if (cell && !cellNeedsCycle(cell)) {
        next.cells[index] = { ...cell, cycleTime: null };
      }
      return normalizeVcConfig(next);
    });
    setSaveMessage(null);
  };

  const updateFloatContent = (id: string, patch: Partial<VcCellAssignment>) => {
    setConfig((prev) => {
      const current = prev.floatContent[id] ?? emptyCell();
      let next: VcModeConfig = {
        ...prev,
        floatContent: {
          ...prev.floatContent,
          [id]: { ...current, ...patch },
        },
      };
      if (patch.slotA === 'visualizer' || patch.slotB === 'visualizer') {
        next = assignVisualizerToRegion(
          next,
          { kind: 'float', id },
          patch.slotA === 'visualizer' ? 'slotA' : 'slotB',
        );
      }
      const cell = next.floatContent[id];
      if (cell && !cellNeedsCycle(cell)) {
        next.floatContent[id] = { ...cell, cycleTime: null };
      }
      return normalizeVcConfig(next);
    });
    setSaveMessage(null);
  };

  const addFloat = () => {
    setConfig((prev) => {
      const float = createFloat(prev.surface.floats);
      if (!float) return prev;
      return normalizeVcConfig({
        ...prev,
        surface: { ...prev.surface, floats: [...prev.surface.floats, float] },
        floatContent: { ...prev.floatContent, [float.id]: emptyCell() },
      });
    });
    setSaveMessage(null);
  };

  const removeSelectedFloat = () => {
    if (selection?.kind !== 'float') return;
    const id = selection.id;
    setConfig((prev) =>
      normalizeVcConfig({
        ...prev,
        surface: {
          ...prev.surface,
          floats: prev.surface.floats.filter((f) => f.id !== id),
        },
      }),
    );
    setSelection(null);
    setSaveMessage(null);
  };

  const updateSelectedFloatNumeric = (field: 'width' | 'height' | 'x' | 'y', pct: number) => {
    if (selection?.kind !== 'float') return;
    const id = selection.id;
    setSurface({
      floats: config.surface.floats.map((f) =>
        f.id === id ? { ...f, [field]: pct / 100 } : f,
      ),
    });
  };

  const pickHostGraphic = async () => {
    const app = getApp();
    const path = await app?.openFile?.({
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    });
    if (path) {
      setConfig((prev) => ({ ...prev, hostGraphicPath: path }));
      setSaveMessage(null);
    }
  };

  const handleSave = async () => {
    const normalized = normalizeVcConfig(config);
    const validationError = validateConfig(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await getApp()?.saveSettings?.(VC_SETTINGS_KEY, normalized);
    setConfig(normalized);
    setSaveMessage('Design saved.');
  };

  const handleStart = () => {
    const normalized = normalizeVcConfig(config);
    const validationError = validateConfig(normalized);
    if (validationError) {
      setError(validationError);
      setStage('content');
      return;
    }
    void getApp()?.saveSettings?.(VC_SETTINGS_KEY, normalized);
    onStart(normalized);
  };

  const handleBackdrop = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const selectedFloat =
    selection?.kind === 'float'
      ? config.surface.floats.find((f) => f.id === selection.id) ?? null
      : null;

  return (
    <div className="vc-modal-backdrop" role="presentation" onClick={handleBackdrop}>
      <div
        className="vc-modal vc-modal-wide panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vc-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vc-modal-header">
          <h2 id="vc-modal-title">VC Mode</h2>
          <p className="vc-modal-lead">
            Design the broadcast surface, assign content, then start VC Mode for screen share.
          </p>
        </header>

        <nav className="vc-stage-tabs" aria-label="VC configuration stages">
          {(
            [
              ['surface', 'Surface'],
              ['content', 'Content'],
              ['start', 'Start'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`vc-stage-tab${stage === id ? ' is-active' : ''}`}
              onClick={() => setStage(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {stage === 'surface' ? (
          <div className="vc-stage-surface">
            <aside className="vc-surface-sidebar">
              <label className="vc-field">
                <span>Division template</span>
                <select
                  value={config.surface.templateId}
                  onChange={(e) => selectTemplate(e.target.value as VcTemplateId)}
                >
                  {VC_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label} ({template.areaCount})
                    </option>
                  ))}
                </select>
              </label>

              <div className="vc-surface-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfig((prev) => resetTemplateProportions(prev))}
                >
                  Reset proportions
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!canAddFloat(config.surface.floats)}
                  onClick={addFloat}
                >
                  Add float ({config.surface.floats.length}/4)
                </button>
              </div>

              {selectedFloat ? (
                <div className="vc-float-inspector">
                  <h3>Selected float</h3>
                  <div className="vc-float-numeric">
                    {(['x', 'y', 'width', 'height'] as const).map((field) => (
                      <label key={field} className="vc-field">
                        <span>{field}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(selectedFloat[field] * 100)}
                          onChange={(e) =>
                            updateSelectedFloatNumeric(field, Number(e.target.value))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="vc-surface-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        setSurface({
                          floats: bringFloatToFront(config.surface.floats, selectedFloat.id),
                        })
                      }
                    >
                      Bring to front
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        setSurface({
                          floats: sendFloatToBack(config.surface.floats, selectedFloat.id),
                        })
                      }
                    >
                      Send to back
                    </button>
                    <button type="button" className="btn" onClick={removeSelectedFloat}>
                      Remove float
                    </button>
                  </div>
                </div>
              ) : (
                <p className="vc-content-hint">
                  Drag dividers to resize areas. Add floats for PiP-style regions.
                </p>
              )}

              <p className="vc-content-hint">
                Active areas: {activeAreaCount(config)} · Floats: {config.surface.floats.length}
              </p>
            </aside>

            <DesignerCanvas
              config={config}
              previewState={designerPreview}
              selection={selection}
              onSelect={setSelection}
              onChangeSurface={setSurface}
            />
          </div>
        ) : null}

        {stage === 'content' ? (
          <div className="vc-stage-content">
            {visualizerAssigned ? (
              <label className="vc-field">
                <span>Visualizer plugin</span>
                <select
                  value={config.visualizerId}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, visualizerId: e.target.value }))
                  }
                >
                  {windowVisualizers.map((plugin) => (
                    <option key={plugin.id} value={plugin.id}>
                      {plugin.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="vc-field">
              <span>VC host graphic (PNG/JPG)</span>
              <div className="vc-host-picker">
                <button type="button" className="btn" onClick={() => void pickHostGraphic()}>
                  Choose image…
                </button>
                {config.hostGraphicPath ? (
                  <code className="vc-host-path">{config.hostGraphicPath}</code>
                ) : null}
              </div>
            </div>

            <ContentAssignmentPanel
              config={config}
              onUpdateArea={updateArea}
              onUpdateFloat={updateFloatContent}
            />
          </div>
        ) : null}

        {stage === 'start' ? (
          <div className="vc-stage-start">
            <p>
              Template: <strong>{config.surface.templateId}</strong>
            </p>
            <p>
              Base areas: <strong>{activeAreaCount(config)}</strong> · Floats:{' '}
              <strong>{config.surface.floats.length}</strong>
            </p>
            <p className="vc-content-hint">
              Save Design stores this configuration without launching. Start VC Mode opens the
              external presentation window using the current design.
            </p>
          </div>
        ) : null}

        {error ? <p className="error vc-modal-error">{error}</p> : null}
        {saveMessage ? <p className="vc-save-message">{saveMessage}</p> : null}

        <div className="vc-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => void handleSave()}>
            Save Design
          </button>
          <button type="button" className="btn vc-start-btn" onClick={handleStart}>
            Start VC Mode
          </button>
        </div>
      </div>
    </div>
  );
}
