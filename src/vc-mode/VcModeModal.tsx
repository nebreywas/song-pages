/**
 * VC Mode — single-screen Surface/View Designer.
 * Template bar → visualizer bar → canvas → Save / Start.
 * Right-click areas/floats to assign content.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VC_TEMPLATES } from '@shared/vcSurface/templates';
import {
  bringFloatToFront,
  canAddFloat,
  clampFloat,
  createFloat,
  sendFloatToBack,
  type VcFloatGeometry,
} from '@shared/vcSurface/floats';
import {
  allContentAssignments,
  assignVisualizerToRegion,
  emptyCell,
  isHostContentKind,
  isSongConfigurableContent,
  normalizeVcConfig,
  resetTemplateProportions,
  switchTemplate,
  type VcCellAssignment,
  type VcModeConfig,
  type VcStatePayload,
  type VcTemplateId,
  VC_VISUALIZER_CHANGE_RULE_OPTIONS,
  VC_VISUALIZER_SEQUENCE_OPTIONS,
} from '@shared/vcModeTypes';
import {
  createDefaultHostContentCatalog,
  HOST_CONTENT_SETTINGS_KEY,
  migrateHostContentCatalog,
  type HostContentCatalog,
} from '@shared/hostContent';
import type { VcGridDesignSettings } from '@shared/vcMode/gridDesign';
import { listUnresolvedHostAssignments } from '@shared/vcMode/assignmentValidation';

import { getApp } from '../lib/bridge';
import { listVisualizers, visualizerSupportsSurface } from '../visualizers/registry';
import { useVcVisualizerRotation } from './useVcVisualizerRotation';
import { DesignerCanvas, type DesignerSelection } from './designer/DesignerCanvas';
import { GridDesignSettingsPanel } from './designer/GridDesignSettingsPanel';
import { RegionContentPopover, type RegionTarget } from './designer/RegionContentPopover';
import { HostContentManager } from './host-content/HostContentManager';
import { createDefaultVcConfig, migrateVcConfig, VC_SETTINGS_KEY } from './vcModeDefaults';
import { useAutoSaveVcConfig, vcConfigSaveStatusLabel } from './useAutoSaveVcConfig';

type VcModeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: (config: VcModeConfig) => void;
  previewState?: VcStatePayload | null;
};

type PopoverState = {
  target: RegionTarget;
};

type DesignerTab = 'surface' | 'host-content' | 'kudos' | 'settings';

const DESIGNER_TABS: Array<{ id: DesignerTab; label: string }> = [
  { id: 'surface', label: 'Surface' },
  { id: 'host-content', label: 'Host Content' },
  { id: 'kudos', label: 'Kudos' },
  { id: 'settings', label: 'Settings' },
];

function cellNeedsCycle(cell: VcCellAssignment): boolean {
  return cell.slotA !== '' && cell.slotB !== '';
}

function validateConfigForSave(config: VcModeConfig): string | null {
  const normalized = normalizeVcConfig(config);
  let visualizerCount = 0;

  for (const cell of allContentAssignments(normalized)) {
    if (cell.slotA === 'visualizer') visualizerCount += 1;
    if (cell.slotB === 'visualizer') visualizerCount += 1;
    if (cellNeedsCycle(cell) && !cell.cycleTime) {
      return 'Each region with primary and secondary content needs a transition trigger.';
    }
  }

  if (visualizerCount > 1) {
    return 'Only one region can use the visualizer.';
  }

  return null;
}

function validateConfigForStart(config: VcModeConfig): string | null {
  const saveError = validateConfigForSave(config);
  if (saveError) return saveError;

  const unresolved = listUnresolvedHostAssignments(normalizeVcConfig(config));
  if (unresolved.length === 0) return null;

  return `Resolve host content assignments before starting VC:\n${unresolved.map((line) => `• ${line}`).join('\n')}`;
}

function applyCellPatch(
  config: VcModeConfig,
  target: RegionTarget,
  patch: Partial<VcCellAssignment>,
): VcModeConfig {
  const mergeCell = (cell: VcCellAssignment, cellPatch: Partial<VcCellAssignment>): VcCellAssignment => {
    const next = { ...cell, ...cellPatch };
    if (cellPatch.backgroundColor === undefined && 'backgroundColor' in cellPatch) {
      delete next.backgroundColor;
    }
    if (cellPatch.borderColor === undefined && 'borderColor' in cellPatch) {
      delete next.borderColor;
    }
    if (cellPatch.borderStyle === undefined && 'borderStyle' in cellPatch) {
      delete next.borderStyle;
    }
    if (cellPatch.borderThicknessPx === undefined && 'borderThicknessPx' in cellPatch) {
      delete next.borderThicknessPx;
    }
    if (cellPatch.lockAppearanceToGrid === false && 'lockAppearanceToGrid' in cellPatch) {
      delete next.lockAppearanceToGrid;
    }
    if (cellPatch.savedRegionAppearance === undefined && 'savedRegionAppearance' in cellPatch) {
      delete next.savedRegionAppearance;
    }
    if (cellPatch.slotA !== undefined) {
      if (!isHostContentKind(next.slotA)) next.hostSlotA = null;
      if (!isSongConfigurableContent(next.slotA)) next.songSlotA = null;
    }
    if (cellPatch.slotB !== undefined) {
      if (!isHostContentKind(next.slotB)) next.hostSlotB = null;
      if (!isSongConfigurableContent(next.slotB)) next.songSlotB = null;
    }
    return next;
  };

  if (target.kind === 'area') {
    const index = target.areaNumber - 1;
    let next: VcModeConfig = {
      ...config,
      cells: config.cells.map((cell, i) =>
        i === index ? mergeCell(cell, patch) : cell,
      ),
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
      next.cells[index] = { ...cell, cycleTime: null, transitionStyle: 'replace' };
    }
    return normalizeVcConfig(next);
  }

  const current = config.floatContent[target.id] ?? emptyCell();
  let next: VcModeConfig = {
    ...config,
    floatContent: {
      ...config.floatContent,
      [target.id]: mergeCell(current, patch),
    },
  };
  if (patch.slotA === 'visualizer' || patch.slotB === 'visualizer') {
    next = assignVisualizerToRegion(
      next,
      { kind: 'float', id: target.id },
      patch.slotA === 'visualizer' ? 'slotA' : 'slotB',
    );
  }
  const cell = next.floatContent[target.id];
  if (cell && !cellNeedsCycle(cell)) {
    next.floatContent[target.id] = { ...cell, cycleTime: null, transitionStyle: 'replace' };
  }
  return normalizeVcConfig(next);
}

export function VcModeModal({ open, onClose, onStart, previewState = null }: VcModeModalProps) {
  const [config, setConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const [hostCatalog, setHostCatalog] = useState<HostContentCatalog>(() => createDefaultHostContentCatalog());
  const [designerTab, setDesignerTab] = useState<DesignerTab>('surface');
  const [selection, setSelection] = useState<DesignerSelection>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [gridDesignOpen, setGridDesignOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { saveStatus, isHydrated, markHydrated, resetHydration, flushSave } = useAutoSaveVcConfig({
    enabled: open,
    config,
  });
  const saveStatusLabel = isHydrated ? vcConfigSaveStatusLabel(saveStatus) : null;
  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  // Load persisted config once when the designer opens — never re-run on config edits.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const app = getApp();
    if (!app?.getSettings) return;

    void app.getSettings(VC_SETTINGS_KEY).then((saved) => {
      if (cancelled) return;
      setConfig(migrateVcConfig(saved));
      setError(null);
      setSelection(null);
      setPopover(null);
      setGridDesignOpen(false);
      setDesignerTab('surface');
      markHydrated();
    });
    void app.getSettings(HOST_CONTENT_SETTINGS_KEY).then((raw) => {
      if (cancelled) return;
      setHostCatalog(migrateHostContentCatalog(raw));
    });

    return () => {
      cancelled = true;
    };
  }, [open, markHydrated]);

  // Flush pending saves when the designer closes.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (wasOpen && !open) {
      void flushSaveRef.current().finally(() => resetHydration());
    }
  }, [open, resetHydration]);

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

  const designerVisualizerRotation = useVcVisualizerRotation({
    vcOpen: open && visualizerAssigned,
    config,
    playingSongId:
      previewState?.audioMirror?.songId ?? previewState?.currentSong?.id ?? null,
  });

  const designerPreview = useMemo((): VcStatePayload => {
    if (!previewState) {
      return {
        config,
        playback: { currentTime: 0, duration: 0, isPlaying: false },
        audioMirror: { songId: null, playbackUrl: null, volume: 1 },
        currentSong: null,
        nextSong: null,
        upcoming: [],
        hostGraphicUrl: null,
        artistName: null,
        artistBio: null,
        artistPhotoUrl: null,
      };
    }
    return {
      ...previewState,
      config,
      hostGraphicUrl: null,
    };
  }, [config, previewState]);

  const reloadHostCatalog = useCallback(() => {
    const app = getApp();
    if (!app?.getSettings) return;
    void app.getSettings(HOST_CONTENT_SETTINGS_KEY).then((raw) => {
      setHostCatalog(migrateHostContentCatalog(raw));
    });
  }, []);

  const selectDesignerTab = useCallback(
    (tab: DesignerTab) => {
      setDesignerTab(tab);
      if (tab !== 'surface') {
        setPopover(null);
        setGridDesignOpen(false);
        setSelection(null);
      }
      if (tab === 'surface') {
        reloadHostCatalog();
      }
    },
    [reloadHostCatalog],
  );

  const setSurface = useCallback((patch: Partial<VcModeConfig['surface']>) => {
    setConfig((prev) =>
      normalizeVcConfig({
        ...prev,
        surface: { ...prev.surface, ...patch },
      }),
    );
  }, []);

  const selectTemplate = (templateId: VcTemplateId) => {
    setConfig((prev) => switchTemplate(prev, templateId));
    setSelection(null);
    setPopover(null);
  };

  const openRegionPopover = (target: RegionTarget, _event: React.MouseEvent) => {
    setSelection(target.kind === 'area' ? { kind: 'area', areaNumber: target.areaNumber } : { kind: 'float', id: target.id });
    setPopover({ target });
  };

  const closeRegionPopover = useCallback(() => setPopover(null), []);

  const openGridDesignSettings = useCallback(() => {
    setGridDesignOpen(true);
  }, []);

  const closeGridDesignSettings = useCallback(() => setGridDesignOpen(false), []);

  const updateRegionCell = (target: RegionTarget, patch: Partial<VcCellAssignment>) => {
    setConfig((prev) => applyCellPatch(prev, target, patch));
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
  };

  const updateGridDesign = (gridDesign: VcGridDesignSettings) => {
    setConfig((prev) => normalizeVcConfig({ ...prev, gridDesign }));
  };

  const handleStart = async () => {
    const normalized = normalizeVcConfig(config);
    const validationError = validateConfigForStart(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const saved = await flushSave();
    if (!saved) {
      setError('Could not save your design. Try again before starting VC.');
      return;
    }
    onStart(normalized);
  };

  const handleBackdrop = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const popoverCell =
    popover?.target.kind === 'area'
      ? config.cells[popover.target.areaNumber - 1] ?? emptyCell()
      : popover?.target.kind === 'float'
        ? config.floatContent[popover.target.id] ?? emptyCell()
        : null;

  const popoverFloat =
    popover?.target.kind === 'float'
      ? config.surface.floats.find((f) => f.id === popover.target.id)
      : undefined;

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
          <h2 id="vc-modal-title">VC Mode Designer</h2>
          {saveStatusLabel ? (
            <p
              className={`vc-autosave-status vc-autosave-status-${saveStatus}`}
              aria-live="polite"
            >
              {saveStatusLabel}
            </p>
          ) : null}
        </header>

        <nav className="vc-designer-tabs" role="tablist" aria-label="VC Mode Designer sections">
          {DESIGNER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`vc-designer-tab-${tab.id}`}
              className={`vc-designer-tab${designerTab === tab.id ? ' is-active' : ''}`}
              aria-selected={designerTab === tab.id}
              aria-controls={`vc-designer-panel-${tab.id}`}
              onClick={() => selectDesignerTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="vc-designer-stage">
          {designerTab === 'surface' ? (
            <div
              className="vc-designer-tab-panel"
              role="tabpanel"
              id="vc-designer-panel-surface"
              aria-labelledby="vc-designer-tab-surface"
            >
              <div className="vc-surface-toolbar">
                <label className="vc-toolbar-field">
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfig((prev) => resetTemplateProportions(prev))}
                >
                  Reset grid
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!canAddFloat(config.surface.floats)}
                  onClick={addFloat}
                >
                  Add float
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={openGridDesignSettings}
                >
                  Grid Design Settings
                </button>
              </div>

              {visualizerAssigned ? (
                <div className="vc-visualizer-bar">
                  <label className="vc-field vc-visualizer-bar-plugin">
                    <span>Visualizer plugin</span>
                    <select
                      value={config.visualizerId}
                      onChange={(e) => {
                        setConfig((prev) => ({ ...prev, visualizerId: e.target.value }));
                      }}
                    >
                      {windowVisualizers.map((plugin) => (
                        <option key={plugin.id} value={plugin.id}>
                          {plugin.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="vc-field vc-visualizer-bar-rule">
                    <span>Change Rule</span>
                    <select
                      value={config.visualizerChangeRule}
                      onChange={(e) =>
                        setConfig((prev) =>
                          normalizeVcConfig({
                            ...prev,
                            visualizerChangeRule:
                              e.target.value as VcModeConfig['visualizerChangeRule'],
                          }),
                        )
                      }
                    >
                      {VC_VISUALIZER_CHANGE_RULE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="vc-field vc-visualizer-bar-sequence">
                    <span>Sequence</span>
                    <select
                      value={config.visualizerSequence}
                      onChange={(e) =>
                        setConfig((prev) =>
                          normalizeVcConfig({
                            ...prev,
                            visualizerSequence:
                              e.target.value as VcModeConfig['visualizerSequence'],
                          }),
                        )
                      }
                    >
                      {VC_VISUALIZER_SEQUENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <p className="vc-content-hint vc-canvas-hint">
                Right-click an area or float to assign content. Left-click floats to drag; use the corner
                handle to resize.
              </p>

              <DesignerCanvas
                config={config}
                hostCatalog={hostCatalog}
                previewState={designerPreview}
                selection={selection}
                onSelect={setSelection}
                onChangeSurface={setSurface}
                onRegionContextMenu={openRegionPopover}
                previewVisualizerId={designerVisualizerRotation.effectiveVisualizerId}
                onPreviewVisualizerClick={designerVisualizerRotation.rotateVisualizer}
                previewVisualizerClickEnabled={designerVisualizerRotation.visualizerClickEnabled}
              />
            </div>
          ) : null}

          {designerTab === 'host-content' ? (
            <div
              className="vc-designer-tab-panel"
              role="tabpanel"
              id="vc-designer-panel-host-content"
              aria-labelledby="vc-designer-tab-host-content"
            >
              <HostContentManager />
            </div>
          ) : null}

          {designerTab === 'kudos' ? (
            <div
              className="vc-designer-tab-panel vc-tab-placeholder"
              role="tabpanel"
              id="vc-designer-panel-kudos"
              aria-labelledby="vc-designer-tab-kudos"
            >
              <p className="vc-tab-placeholder-lead">Kudos configuration will live here.</p>
            </div>
          ) : null}

          {designerTab === 'settings' ? (
            <div
              className="vc-designer-tab-panel"
              role="tabpanel"
              id="vc-designer-panel-settings"
              aria-labelledby="vc-designer-tab-settings"
            >
              <div className="vc-settings-panel">
                <label className="vc-field vc-field-inline">
                  <input
                    type="checkbox"
                    checked={config.useFallbacks !== false}
                    onChange={(e) => {
                      setConfig((prev) =>
                        normalizeVcConfig({ ...prev, useFallbacks: e.target.checked }),
                      );
                    }}
                  />
                  <span>Use fallbacks when song content is missing</span>
                </label>
                <p className="vc-settings-hint">
                  When enabled, missing song fields resolve through Host Content fallbacks, then system
                  defaults. When disabled, unavailable song content renders blank.
                </p>
              </div>
            </div>
          ) : null}

          {designerTab === 'surface' && popover && popoverCell ? (
            <RegionContentPopover
              target={popover.target}
              cell={popoverCell}
              catalog={hostCatalog}
              gridDesign={config.gridDesign}
              float={popoverFloat}
              onUpdateCell={(patch) => updateRegionCell(popover.target, patch)}
              onBringFloatToFront={
                popover.target.kind === 'float'
                  ? () =>
                      setSurface({
                        floats: bringFloatToFront(config.surface.floats, popover.target.id),
                      })
                  : undefined
              }
              onSendFloatToBack={
                popover.target.kind === 'float'
                  ? () =>
                      setSurface({
                        floats: sendFloatToBack(config.surface.floats, popover.target.id),
                      })
                  : undefined
              }
              onRemoveFloat={
                popover.target.kind === 'float'
                  ? () => {
                      setConfig((prev) =>
                        normalizeVcConfig({
                          ...prev,
                          surface: {
                            ...prev.surface,
                            floats: prev.surface.floats.filter((f) => f.id !== popover.target.id),
                          },
                          floatContent: Object.fromEntries(
                            Object.entries(prev.floatContent).filter(
                              ([id]) => id !== popover.target.id,
                            ),
                          ),
                        }),
                      );
                      setPopover(null);
                      setSelection(null);
                    }
                  : undefined
              }
              onUpdateFloatField={
                popover.target.kind === 'float' && popoverFloat
                  ? (field, pct) =>
                      setSurface({
                        floats: config.surface.floats.map((f) =>
                          f.id === popover.target.id ? clampFloat({ ...f, [field]: pct / 100 }) : f,
                        ),
                      })
                  : undefined
              }
              onUpdateFloat={
                popover.target.kind === 'float' && popoverFloat
                  ? (patch) =>
                      setSurface({
                        floats: config.surface.floats.map((f) => {
                          if (f.id !== popover.target.id) return f;
                          const next: VcFloatGeometry = { ...f, ...patch };
                          if (patch.backgroundColor === undefined) delete next.backgroundColor;
                          if (patch.borderColor === undefined) delete next.borderColor;
                          if (patch.borderStyle === undefined) delete next.borderStyle;
                          if (patch.borderThicknessPx === undefined) delete next.borderThicknessPx;
                          if (patch.backgroundOpacityPct === undefined) {
                            delete next.backgroundOpacityPct;
                          }
                          if (patch.contentOpacityPct === undefined) delete next.contentOpacityPct;
                          if (patch.lockAppearanceToGrid === false) delete next.lockAppearanceToGrid;
                          if (patch.savedRegionAppearance === undefined && 'savedRegionAppearance' in patch) {
                            delete next.savedRegionAppearance;
                          }
                          return clampFloat(next);
                        }),
                      })
                  : undefined
              }
              onClose={closeRegionPopover}
            />
          ) : null}

          {designerTab === 'surface' && gridDesignOpen ? (
            <GridDesignSettingsPanel
              gridDesign={config.gridDesign}
              hostCatalog={hostCatalog}
              onChange={updateGridDesign}
              onClose={closeGridDesignSettings}
            />
          ) : null}
        </div>

        {designerTab === 'surface' && error ? <p className="error vc-modal-error">{error}</p> : null}

        {designerTab === 'surface' ? (
          <div className="vc-modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn vc-start-btn" onClick={() => void handleStart()}>
              Start VC Mode
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
