/**
 * VC Mode — single-screen Surface/View Designer.
 * Template bar → canvas → footer. Right-click areas/floats to assign content.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VC_TEMPLATES } from '@shared/vcSurface/templates';
import {
  bringFloatToFront,
  canAddFloat,
  clampFloat,
  clampRotationDeg,
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
  VC_UPCOMING_OVERLAY_MAX_OPTIONS,
  VC_UPCOMING_OVERLAY_POSITION_OPTIONS,
  type VcModeConfig,
  type VcStatePayload,
  type VcTemplateId,
} from '@shared/vcModeTypes';
import { DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR } from '@shared/vcMode/playbackEffectsMirror';
import {
  VC_SPECIAL_PLAY_STYLE_OPTIONS,
  type VcSpecialPlayStyle,
} from '@shared/vcMode/specialPlayStyles';
import type { KudoPreset } from '@shared/kudos';
import { VC_SURFACE_DESIGNS_KEY, type VcSurfaceDesign } from '@shared/vcSurfaceDesigns';
import {
  createDefaultHostContentCatalog,
  HOST_CONTENT_SETTINGS_KEY,
  listItemsByType,
  migrateHostContentCatalog,
  type HostContentCatalog,
} from '@shared/hostContent';
import type { VcGridDesignSettings } from '@shared/vcMode/gridDesign';
import { listUnresolvedHostAssignments } from '@shared/vcMode/assignmentValidation';

import { getApp } from '../lib/bridge';
import { listVisualizers, visualizerSupportsSurface } from '../visualizers/registry';
import { useVcVisualizerRotation } from './useVcVisualizerRotation';
import { DesignerCanvas, type DesignerSelection } from './designer/DesignerCanvas';
import { SurfaceDesignDeleteConfirmModal } from './designer/SurfaceDesignDeleteConfirmModal';
import { SurfaceDesignsPopover } from './designer/SurfaceDesignsPopover';
import { GridDesignSettingsPanel } from './designer/GridDesignSettingsPanel';
import { RegionContentPopover, type RegionTarget } from './designer/RegionContentPopover';
import { HelpTooltip } from '../components/HelpTooltip';
import { HostContentManager } from './host-content/HostContentManager';
import { KeyBindingsPanel } from '../commands/KeyBindingsPanel';
import { KudosManager } from './kudos/KudosManager';
import { HostGraphicPreviewPopover } from './settings/HostGraphicPreviewPopover';
import { createDefaultVcConfig, VC_SETTINGS_KEY } from './vcModeDefaults';
import { useAutoSaveVcConfig, vcConfigSaveStatusLabel } from './useAutoSaveVcConfig';
import { useVcSurfaceDesigns } from './useVcSurfaceDesigns';
import { useHostGraphicPopupUrl } from './useHostGraphicPopupUrl';

type VcModeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: (config: VcModeConfig) => void;
  previewState?: VcStatePayload | null;
  kudos?: {
    presets: KudoPreset[];
    addPreset: (preset: KudoPreset) => Promise<unknown>;
    updatePreset: (id: string, patch: Partial<KudoPreset>) => Promise<unknown>;
    deletePreset: (id: string) => Promise<unknown>;
    reorderPresets: (fromIndex: number, toIndex: number) => Promise<unknown>;
  };
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

const DESIGNER_TAB_FOOTER_HINTS: Record<DesignerTab, string> = {
  surface:
    'Right-click an area or float to assign content. Left-click floats to drag; use the corner handle to resize.',
  'host-content':
    'Create reusable host content — graphics, text groups, and fallback slots for your surface assignments.',
  kudos: 'Define Kudo presets for audience reactions; bind keys in Settings when a preset is ready.',
  settings: 'Configure content protection, between-song behavior, and key bindings for your show.',
};

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

export function VcModeModal({ open, onClose, onStart, previewState = null, kudos }: VcModeModalProps) {
  const [config, setConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const configRef = useRef(config);
  configRef.current = config;
  const [hostCatalog, setHostCatalog] = useState<HostContentCatalog>(() => createDefaultHostContentCatalog());
  const [designerTab, setDesignerTab] = useState<DesignerTab>('surface');
  const [selection, setSelection] = useState<DesignerSelection>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [gridDesignOpen, setGridDesignOpen] = useState(false);
  const [surfaceDesignPendingDelete, setSurfaceDesignPendingDelete] = useState<VcSurfaceDesign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const surfaceDesigns = useVcSurfaceDesigns();

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

    void Promise.all([
      app.getSettings(VC_SURFACE_DESIGNS_KEY),
      app.getSettings(VC_SETTINGS_KEY),
    ]).then(async ([catalogRaw, saved]) => {
      if (cancelled) return;
      const catalog = await surfaceDesigns.hydrateCatalog(catalogRaw, saved);
      const active = catalog.designs.find((design) => design.id === catalog.activeDesignId) ?? catalog.designs[0]!;
      setConfig(active.config);
      setError(null);
      setSelection(null);
      setPopover(null);
      setGridDesignOpen(false);
      setSurfaceDesignPendingDelete(null);
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
  }, [open, markHydrated, surfaceDesigns.hydrateCatalog]);

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

  const hostGraphicPopupUrl = useHostGraphicPopupUrl(hostCatalog, config.hostGraphicPopupId);
  const hostGraphicOptions = useMemo(() => listItemsByType(hostCatalog, 'graphic'), [hostCatalog]);

  const designerPreview = useMemo((): VcStatePayload => {
    if (!previewState) {
      return {
        config,
        playback: { currentTime: 0, duration: 0, isPlaying: false },
        audioMirror: { songId: null, playbackUrl: null, volume: 1, playbackEffects: DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR },
        currentSong: null,
        nextSong: null,
        upcoming: [],
        hostGraphicUrl: hostGraphicPopupUrl,
        artistName: null,
        artistBio: null,
        artistPhotoUrl: null,
      };
    }
    return {
      ...previewState,
      config,
      hostGraphicUrl: hostGraphicPopupUrl,
    };
  }, [config, hostGraphicPopupUrl, previewState]);

  const reloadHostCatalog = useCallback(() => {
    const app = getApp();
    if (!app?.getSettings) return;
    void app.getSettings(HOST_CONTENT_SETTINGS_KEY).then((raw) => {
      setHostCatalog(migrateHostContentCatalog(raw));
    });
  }, []);

  const applySurfaceDesignConfig = useCallback((next: VcModeConfig) => {
    setConfig(next);
    setSelection(null);
    setPopover(null);
    setGridDesignOpen(false);
    setError(null);
  }, []);

  const handleSelectSurfaceDesign = useCallback(
    async (designId: string) => {
      if (designId === surfaceDesigns.catalog.activeDesignId) return;
      await flushSave();
      const result = await surfaceDesigns.switchDesign(designId, configRef.current);
      applySurfaceDesignConfig(result.config);
    },
    [applySurfaceDesignConfig, flushSave, surfaceDesigns],
  );

  const handleCreateSurfaceDesign = useCallback(async () => {
    await flushSave();
    const result = await surfaceDesigns.createDesign(configRef.current);
    applySurfaceDesignConfig(result.config);
  }, [applySurfaceDesignConfig, flushSave, surfaceDesigns]);

  const handleRenameSurfaceDesign = useCallback(
    async (designId: string, name: string) => {
      await surfaceDesigns.renameDesign(designId, name);
    },
    [surfaceDesigns],
  );

  const handleRequestDeleteSurfaceDesign = useCallback((design: VcSurfaceDesign) => {
    setSurfaceDesignPendingDelete(design);
  }, []);

  const handleConfirmDeleteSurfaceDesign = useCallback(async () => {
    if (!surfaceDesignPendingDelete) return;
    await flushSave();
    const result = await surfaceDesigns.deleteDesign(surfaceDesignPendingDelete.id, configRef.current);
    setSurfaceDesignPendingDelete(null);
    if (result) applySurfaceDesignConfig(result.config);
  }, [
    applySurfaceDesignConfig,
    flushSave,
    surfaceDesignPendingDelete,
    surfaceDesigns,
  ]);

  const selectDesignerTab = useCallback(
    (tab: DesignerTab) => {
      setDesignerTab(tab);
      if (tab !== 'surface') {
        setPopover(null);
        setGridDesignOpen(false);
        setSelection(null);
      }
      if (tab === 'surface' || tab === 'settings') {
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
          <button
            type="button"
            className="vc-modal-close"
            onClick={onClose}
            aria-label="Close VC Mode Designer"
          >
            ×
          </button>
        </header>

        <div className="vc-designer-tabs-bar">
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
        </div>

        <div className="vc-designer-stage">
          {designerTab === 'surface' ? (
            <div
              className="vc-designer-tab-panel"
              role="tabpanel"
              id="vc-designer-panel-surface"
              aria-labelledby="vc-designer-tab-surface"
            >
              <div className="vc-surface-toolbar">
                <SurfaceDesignsPopover
                  designs={surfaceDesigns.catalog.designs}
                  activeDesignId={surfaceDesigns.catalog.activeDesignId}
                  onSelect={(designId) => void handleSelectSurfaceDesign(designId)}
                  onCreate={() => void handleCreateSurfaceDesign()}
                  onRename={(designId, name) => void handleRenameSurfaceDesign(designId, name)}
                  onDelete={handleRequestDeleteSurfaceDesign}
                />
                <label className="vc-toolbar-field">
                  <span>Grid area template</span>
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
                {saveStatusLabel ? (
                  <p
                    className={`vc-autosave-status vc-surface-toolbar-autosave vc-autosave-status-${saveStatus}`}
                    aria-live="polite"
                  >
                    {saveStatusLabel}
                  </p>
                ) : null}
              </div>

              <DesignerCanvas
                config={config}
                hostCatalog={hostCatalog}
                previewState={designerPreview}
                selection={selection}
                onSelect={setSelection}
                onChangeSurface={setSurface}
                onRegionContextMenu={openRegionPopover}
                onSurfaceLayoutCommit={() => void flushSaveRef.current()}
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
              className="vc-designer-tab-panel"
              role="tabpanel"
              id="vc-designer-panel-kudos"
              aria-labelledby="vc-designer-tab-kudos"
            >
              {kudos ? (
                <KudosManager
                  presets={kudos.presets}
                  onAddPreset={kudos.addPreset}
                  onUpdatePreset={kudos.updatePreset}
                  onDeletePreset={kudos.deletePreset}
                  onReorderPresets={kudos.reorderPresets}
                />
              ) : (
                <p className="vc-tab-placeholder-lead">Loading Kudos…</p>
              )}
            </div>
          ) : null}

          {designerTab === 'settings' ? (
            <div
              className="vc-designer-tab-panel vc-designer-tab-panel-scroll"
              role="tabpanel"
              id="vc-designer-panel-settings"
              aria-labelledby="vc-designer-tab-settings"
            >
              <div className="vc-settings-panel">
                <section className="vc-settings-section">
                  <h3>VC Mode Settings</h3>

                  <div className="vc-settings-checkbox-row">
                    <label className="vc-field vc-field-inline vc-settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={config.useFallbacks !== false}
                        onChange={(e) => {
                          setConfig((prev) =>
                            normalizeVcConfig({ ...prev, useFallbacks: e.target.checked }),
                          );
                        }}
                      />
                      <span>Missing content protection</span>
                    </label>
                    <HelpTooltip ariaLabel="About missing content protection">
                      When enabled, missing information attempts to be resolved by host/system content
                      to avoid blank VC mode content.
                    </HelpTooltip>
                  </div>

                  <div className="vc-settings-checkbox-row vc-settings-checkbox-row-indent">
                    <label className="vc-field vc-field-inline vc-settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={config.suppressEmbedProviderLyricsMessages === true}
                        disabled={config.useFallbacks === false}
                        onChange={(e) => {
                          setConfig((prev) =>
                            normalizeVcConfig({
                              ...prev,
                              suppressEmbedProviderLyricsMessages: e.target.checked,
                            }),
                          );
                        }}
                      />
                      <span>Suppress SoundCloud and YouTube lyrics messages</span>
                    </label>
                    <HelpTooltip ariaLabel="About suppressing embed lyrics messages">
                      When enabled, lyrics cells stay blank for YouTube and SoundCloud tracks instead of
                      showing the platform notice about captions or missing lyrics.
                    </HelpTooltip>
                  </div>

                  <div className="vc-settings-host-popup">
                    <label className="vc-settings-host-popup-label" htmlFor="vc-host-graphic-popup">
                      Host Content Graphic Popup
                    </label>
                    <div className="vc-settings-host-popup-controls">
                      <select
                        id="vc-host-graphic-popup"
                        className="vc-settings-host-popup-select"
                        value={config.hostGraphicPopupId ?? ''}
                        onChange={(e) => {
                          setConfig((prev) =>
                            normalizeVcConfig({
                              ...prev,
                              hostGraphicPopupId: e.target.value || null,
                            }),
                          );
                        }}
                      >
                        <option value="">None</option>
                        {hostGraphicOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <HostGraphicPreviewPopover
                        itemId={config.hostGraphicPopupId}
                        catalog={hostCatalog}
                      />
                    </div>
                    <p className="vc-settings-hint">
                      Pops up on the VC surface when you press Toggle Host Graphic Display (default
                      OCAW+F).
                    </p>
                  </div>

                  <div className="vc-settings-upcoming">
                    <label className="vc-settings-upcoming-label" htmlFor="vc-upcoming-position">
                      Upcoming overlay position
                    </label>
                    <select
                      id="vc-upcoming-position"
                      className="vc-settings-upcoming-select"
                      value={config.upcomingOverlay.position}
                      onChange={(e) => {
                        setConfig((prev) =>
                          normalizeVcConfig({
                            ...prev,
                            upcomingOverlay: {
                              ...prev.upcomingOverlay,
                              position: e.target.value as VcModeConfig['upcomingOverlay']['position'],
                            },
                          }),
                        );
                      }}
                    >
                      {VC_UPCOMING_OVERLAY_POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label className="vc-settings-upcoming-label" htmlFor="vc-upcoming-max">
                      Max upcoming to display
                    </label>
                    <select
                      id="vc-upcoming-max"
                      className="vc-settings-upcoming-select"
                      value={config.upcomingOverlay.maxCount}
                      onChange={(e) => {
                        setConfig((prev) =>
                          normalizeVcConfig({
                            ...prev,
                            upcomingOverlay: {
                              ...prev.upcomingOverlay,
                              maxCount: Number(e.target.value) as VcModeConfig['upcomingOverlay']['maxCount'],
                            },
                          }),
                        );
                      }}
                    >
                      {VC_UPCOMING_OVERLAY_MAX_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                    <p className="vc-settings-hint">
                      Toggle Upcoming (default OCAW+U) shows this list on the VC projection surface.
                    </p>
                  </div>
                </section>

                <section className="vc-settings-section">
                  <h3>Special Play Styles</h3>
                  <div className="vc-settings-play-style">
                    <label className="vc-settings-play-style-label" htmlFor="vc-between-song-behavior">
                      Between-song behavior
                    </label>
                    <div className="vc-settings-play-style-controls">
                      <select
                        id="vc-between-song-behavior"
                        className="vc-settings-play-style-select"
                        value={config.specialPlayStyle.style}
                        onChange={(e) => {
                          const style = e.target.value as VcSpecialPlayStyle;
                          setConfig((prev) =>
                            normalizeVcConfig({
                              ...prev,
                              specialPlayStyle: { ...prev.specialPlayStyle, style },
                            }),
                          );
                        }}
                      >
                        {VC_SPECIAL_PLAY_STYLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {config.specialPlayStyle.style !== 'normal' ? (
                        <div className="vc-settings-play-style-options">
                          <label className="vc-field vc-field-inline">
                            <input
                              type="checkbox"
                              checked={config.specialPlayStyle.showCountdownOnSurface}
                              onChange={(e) =>
                                setConfig((prev) =>
                                  normalizeVcConfig({
                                    ...prev,
                                    specialPlayStyle: {
                                      ...prev.specialPlayStyle,
                                      showCountdownOnSurface: e.target.checked,
                                    },
                                  }),
                                )
                              }
                            />
                            <span>Show countdown on screen?</span>
                          </label>
                          <label className="vc-field vc-field-inline">
                            <input
                              type="checkbox"
                              checked={config.specialPlayStyle.showCountdownOnController}
                              onChange={(e) =>
                                setConfig((prev) =>
                                  normalizeVcConfig({
                                    ...prev,
                                    specialPlayStyle: {
                                      ...prev.specialPlayStyle,
                                      showCountdownOnController: e.target.checked,
                                    },
                                  }),
                                )
                              }
                            />
                            <span>Show countdown on surface control?</span>
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="vc-settings-section vc-settings-keybindings">
                  <hr className="vc-settings-section-divider" />
                  <h3>Key Bindings setup</h3>
                  <KeyBindingsPanel />
                </section>
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
                          if (patch.rotationDeg !== undefined) {
                            const rotation = clampRotationDeg(patch.rotationDeg);
                            if (rotation === 0) delete next.rotationDeg;
                            else next.rotationDeg = rotation;
                          }
                          return clampFloat(next);
                        }),
                      })
                  : undefined
              }
              onClose={closeRegionPopover}
              visualizerConfig={{
                visualizerId: config.visualizerId,
                visualizerChangeRule: config.visualizerChangeRule,
                visualizerSequence: config.visualizerSequence,
                visualizerAlsoClickToChange: config.visualizerAlsoClickToChange,
              }}
              windowVisualizers={windowVisualizers}
              onVisualizerConfigChange={(patch) =>
                setConfig((prev) => normalizeVcConfig({ ...prev, ...patch }))
              }
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

        <footer className="vc-modal-footer">
          <div className="vc-designer-footer-context">
            {error ? (
              <p className="error vc-designer-footer-hint">{error}</p>
            ) : (
              <p className="vc-content-hint vc-designer-footer-hint">
                {DESIGNER_TAB_FOOTER_HINTS[designerTab]}
              </p>
            )}
          </div>
          <button type="button" className="btn vc-start-btn" onClick={() => void handleStart()}>
            Start VC Mode
          </button>
        </footer>

        <SurfaceDesignDeleteConfirmModal
          open={surfaceDesignPendingDelete != null}
          designName={surfaceDesignPendingDelete?.name ?? ''}
          onConfirm={() => void handleConfirmDeleteSurfaceDesign()}
          onCancel={() => setSurfaceDesignPendingDelete(null)}
        />
      </div>
    </div>
  );
}
