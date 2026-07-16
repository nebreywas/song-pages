/**
 * Centered content-assignment dialog over the designer canvas.
 *
 * - Left: slot assignment (content picks, transition)
 * - Right: tabbed detail panel — Layout (floats), Primary, Secondary when configured
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { hostContentTypeForSlot, listItemsByType, type HostContentCatalog } from '@shared/hostContent';
import type { VcGridDesignSettings } from '@shared/vcMode/gridDesign';
import { resolveAreaBackgroundDisplayColor, resolveFloatAppearanceDraft } from '@shared/vcMode/gridDesign';
import type { VcFloatGeometry } from '@shared/vcSurface/floats';

import { RegionBordersAndBackgrounds } from './RegionBordersAndBackgrounds';
import {
  isHostContentKind,
  isFloatOnlyContent,
  isSongConfigurableContent,
  VC_CYCLE_OPTIONS,
  VC_HOST_CONTENT_OPTIONS,
  VC_SONG_CONTENT_OPTIONS,
  VC_TRANSITION_OPTIONS,
  type VcCellAssignment,
  type VcCellContent,
  type VcCycleTime,
  type VcHostSlotBinding,
  type VcModeConfig,
  type VcSongSlotSettings,
  type VcTransitionStyle,
} from '@shared/vcModeTypes';

import { DesignerOverlayLayer } from './DesignerOverlayLayer';
import { AssignmentSettingsIntro } from './AssignmentSettingsIntro';
import { HostAssignmentSettings } from './HostAssignmentSettings';
import { SongAssignmentSettings } from './SongAssignmentSettings';
import {
  VisualizerAssignmentSettings,
  type VisualizerPluginOption,
} from './VisualizerAssignmentSettings';

export type RegionTarget =
  | { kind: 'area'; areaNumber: number }
  | { kind: 'float'; id: string; index: number };

/** Right-hand detail tabs — Layout is float-only; Primary/Secondary follow slot content. */
type RegionDetailTab = 'layout' | 'primary' | 'secondary';

type RegionContentPopoverProps = {
  target: RegionTarget;
  cell: VcCellAssignment;
  catalog: HostContentCatalog;
  gridDesign: VcGridDesignSettings;
  float?: VcFloatGeometry;
  onUpdateCell: (patch: Partial<VcCellAssignment>) => void;
  onBringFloatToFront?: () => void;
  onSendFloatToBack?: () => void;
  onRemoveFloat?: () => void;
  onUpdateFloatField?: (field: 'x' | 'y' | 'width' | 'height', pct: number) => void;
  onUpdateFloat?: (patch: Partial<VcFloatGeometry>) => void;
  onClose: () => void;
  visualizerConfig: Pick<
    VcModeConfig,
    | 'visualizerId'
    | 'visualizerChangeRule'
    | 'visualizerSequence'
    | 'visualizerAlsoClickToChange'
    | 'showVisualizerName'
  >;
  windowVisualizers: VisualizerPluginOption[];
  onVisualizerConfigChange: (
    patch: Partial<
      Pick<
        VcModeConfig,
        | 'visualizerId'
        | 'visualizerChangeRule'
        | 'visualizerSequence'
        | 'visualizerAlsoClickToChange'
        | 'showVisualizerName'
      >
    >,
  ) => void;
};

function ContentSelect({
  value,
  onChange,
  allowFloatOnly,
}: {
  value: VcCellContent;
  onChange: (value: VcCellContent) => void;
  allowFloatOnly: boolean;
}) {
  const songOptions = allowFloatOnly
    ? VC_SONG_CONTENT_OPTIONS
    : VC_SONG_CONTENT_OPTIONS.filter((opt) => !isFloatOnlyContent(opt.value));

  return (
    <select value={value} onChange={(e) => onChange(e.target.value as VcCellContent)}>
      <option value="">(blank)</option>
      <optgroup label="Song content">
        {songOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Host content">
        {VC_HOST_CONTENT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

function ContentAssignmentFields({
  cell,
  onAssignSlot,
  onUpdateCell,
  allowFloatOnly,
  showPrimaryLabel = true,
}: {
  cell: VcCellAssignment;
  onAssignSlot: (slot: 'slotA' | 'slotB', value: VcCellContent) => void;
  onUpdateCell: (patch: Partial<VcCellAssignment>) => void;
  allowFloatOnly: boolean;
  /** When false, the label is rendered in the dialog header row beside the detail tabs. */
  showPrimaryLabel?: boolean;
}) {
  return (
    <>
      <label className={`vc-field${showPrimaryLabel ? '' : ' vc-field--primary-slot'}`}>
        {showPrimaryLabel ? <span>Primary content</span> : null}
        <ContentSelect
          value={cell.slotA}
          onChange={(value) => onAssignSlot('slotA', value)}
          allowFloatOnly={allowFloatOnly}
        />
      </label>

      <label className="vc-field">
        <span>Secondary content</span>
        <ContentSelect
          value={cell.slotB}
          onChange={(value) => onAssignSlot('slotB', value)}
          allowFloatOnly={allowFloatOnly}
        />
      </label>

      <hr className="vc-region-popover-section-divider" aria-hidden="true" />

      <label className="vc-field">
        <span>Transition trigger</span>
        <select
          value={cell.cycleTime ?? ''}
          disabled={!cellNeedsCycle(cell)}
          onChange={(e) =>
            onUpdateCell({
              cycleTime: e.target.value
                ? e.target.value === 'click'
                  ? 'click'
                  : (Number(e.target.value) as VcCycleTime)
                : null,
            })
          }
        >
          <option value="">—</option>
          {VC_CYCLE_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {cellNeedsCycle(cell) && cell.cycleTime != null ? (
        <label className="vc-field">
          <span>Transition style</span>
          <select
            value={cell.transitionStyle}
            onChange={(e) => onUpdateCell({ transitionStyle: e.target.value as VcTransitionStyle })}
          >
            {VC_TRANSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

function cellNeedsCycle(cell: VcCellAssignment): boolean {
  return cell.slotA !== '' && cell.slotB !== '';
}

function regionTitle(target: RegionTarget): string {
  return target.kind === 'area' ? `Area ${target.areaNumber}` : `Float ${target.index + 1}`;
}

function slotHasDetailTab(content: VcCellContent): boolean {
  return content === 'visualizer' || isHostContentKind(content) || isSongConfigurableContent(content);
}

function availableDetailTabs(
  target: RegionTarget,
  cell: VcCellAssignment,
  showFloatLayout: boolean,
): RegionDetailTab[] {
  const tabs: RegionDetailTab[] = [];
  if (target.kind === 'area' || showFloatLayout) tabs.push('layout');
  if (slotHasDetailTab(cell.slotA)) tabs.push('primary');
  if (slotHasDetailTab(cell.slotB)) tabs.push('secondary');
  return tabs;
}

function defaultDetailTab(
  _target: RegionTarget,
  tabs: RegionDetailTab[],
  cell: VcCellAssignment,
): RegionDetailTab | null {
  if (tabs.length === 0) return null;
  if (cell.slotA === 'visualizer' && tabs.includes('primary')) return 'primary';
  if (cell.slotB === 'visualizer' && tabs.includes('secondary')) return 'secondary';
  if (tabs.includes('layout')) return 'layout';
  return tabs[0];
}

function resolveDetailTab(
  current: RegionDetailTab | null,
  target: RegionTarget,
  tabs: RegionDetailTab[],
  cell: VcCellAssignment,
): RegionDetailTab | null {
  if (tabs.length === 0) return null;
  if (current && tabs.includes(current)) return current;
  return defaultDetailTab(target, tabs, cell);
}

function detailTabLabel(tab: RegionDetailTab): string {
  switch (tab) {
    case 'layout':
      return 'Layout';
    case 'primary':
      return 'Primary';
    case 'secondary':
      return 'Secondary';
  }
}

function HostAssignmentDetail({
  content,
  binding,
  catalog,
  onChange,
}: {
  content: VcCellContent;
  binding: VcHostSlotBinding | null;
  catalog: HostContentCatalog;
  onChange: (binding: VcHostSlotBinding | null) => void;
}) {
  const hostType = hostContentTypeForSlot(content);
  const items = hostType ? listItemsByType(catalog, hostType) : [];
  const resolvedBinding = binding ?? { itemId: '', overrides: {} };

  return (
    <>
      <AssignmentSettingsIntro content={content} />
      <label className="vc-field">
        <span>Select content</span>
        <select
          value={binding?.itemId ?? ''}
          onChange={(e) =>
            onChange(
              e.target.value
                ? { itemId: e.target.value, overrides: binding?.overrides ?? {} }
                : binding?.overrides && Object.keys(binding.overrides).length > 0
                  ? { itemId: '', overrides: binding.overrides }
                  : { itemId: '', overrides: binding?.overrides ?? {} },
            )
          }
        >
          <option value="">—</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <HostAssignmentSettings
        content={content}
        binding={resolvedBinding}
        catalog={catalog}
        onChange={onChange}
      />
    </>
  );
}

function SongAssignmentDetail({
  content,
  settings,
  catalog,
  gridDesign,
  onChange,
}: {
  content: VcCellContent;
  settings: VcSongSlotSettings;
  catalog: HostContentCatalog;
  gridDesign: VcGridDesignSettings;
  onChange: (settings: VcSongSlotSettings) => void;
}) {
  return (
    <SongAssignmentSettings
      content={content}
      settings={settings}
      catalog={catalog}
      gridDesign={gridDesign}
      onChange={onChange}
    />
  );
}

function AreaLayoutDetail({
  cell,
  gridDesign,
  onUpdateCell,
}: {
  cell: VcCellAssignment;
  gridDesign: VcGridDesignSettings;
  onUpdateCell: (patch: Partial<VcCellAssignment>) => void;
}) {
  const resolved = resolveAreaBackgroundDisplayColor(cell, gridDesign);

  return (
    <section className="vc-host-assignment-settings vc-area-layout-settings">
      <RegionBordersAndBackgrounds
        appearanceMode="area"
        gridDesign={gridDesign}
        overrides={cell}
        resolvedBackground={resolved}
        onPatch={onUpdateCell}
      />
    </section>
  );
}

function FloatLayoutDetail({
  float,
  gridDesign,
  onUpdateFloatField,
  onUpdateFloat,
  onBringFloatToFront,
  onSendFloatToBack,
  onRemoveFloat,
}: {
  float: VcFloatGeometry;
  gridDesign: VcGridDesignSettings;
  onUpdateFloatField: (field: 'x' | 'y' | 'width' | 'height', pct: number) => void;
  onUpdateFloat?: (patch: Partial<VcFloatGeometry>) => void;
  onBringFloatToFront?: () => void;
  onSendFloatToBack?: () => void;
  onRemoveFloat?: () => void;
}) {
  const draftAppearance = resolveFloatAppearanceDraft(float, gridDesign);

  return (
    <>
      <div className="vc-field vc-region-field vc-float-layout-field">
        <span className="vc-assignment-sublabel">Position &amp; size</span>
        <div
          className="vc-float-numeric vc-region-field-controls"
          role="group"
          aria-label="Float position and size"
        >
          {(['x', 'y', 'width', 'height'] as const).map((field) => (
            <label key={field} className="vc-float-numeric-field">
              <span className="vc-float-numeric-label">{field}</span>
              <input
                type="number"
                className="vc-float-numeric-input"
                min={0}
                max={100}
                step={1}
                value={Math.round(float[field] * 100)}
                onChange={(e) => onUpdateFloatField(field, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </div>

      {onUpdateFloat ? (
        <div className="vc-field vc-region-field vc-float-layout-field">
          <span className="vc-assignment-sublabel">Rotation</span>
          <div className="vc-float-numeric vc-region-field-controls" role="group" aria-label="Float rotation">
            <label className="vc-float-numeric-field">
              <span className="vc-float-numeric-label">deg</span>
              <input
                type="number"
                className="vc-float-numeric-input"
                min={0}
                max={359}
                step={1}
                value={float.rotationDeg ?? 0}
                onChange={(e) => onUpdateFloat({ rotationDeg: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="vc-float-layout-hint">
            Hold Shift while dragging — move up/down to rotate. Shift+double-click resets rotation to 0°.
          </p>
        </div>
      ) : null}

      {onUpdateFloat ? (
        <section className="vc-host-assignment-settings vc-float-appearance-settings">
          <RegionBordersAndBackgrounds
            appearanceMode="float"
            gridDesign={gridDesign}
            overrides={float}
            resolvedBackground={draftAppearance.backgroundColor}
            resolvedBackgroundOpacityPct={draftAppearance.backgroundOpacityPct}
            resolvedContentOpacityPct={draftAppearance.contentOpacityPct}
            onPatch={onUpdateFloat}
            showOpacitySliders
          />
        </section>
      ) : null}

      <div className="vc-region-popover-actions">
        {onBringFloatToFront || onSendFloatToBack ? (
          <div className="vc-float-z-actions">
            {onBringFloatToFront ? (
              <button type="button" className="btn" onClick={onBringFloatToFront}>
                Bring to front
              </button>
            ) : null}
            {onSendFloatToBack ? (
              <button type="button" className="btn" onClick={onSendFloatToBack}>
                Send to back
              </button>
            ) : null}
          </div>
        ) : null}
        {onRemoveFloat ? (
          <button type="button" className="btn" onClick={onRemoveFloat}>
            Remove float
          </button>
        ) : null}
      </div>
    </>
  );
}

function RegionDetailTabBar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: RegionDetailTab[];
  activeTab: RegionDetailTab;
  onSelect: (tab: RegionDetailTab) => void;
}) {
  return (
    <nav className="vc-region-popover-tabs" aria-label="Region settings">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          className={`vc-region-popover-tab${activeTab === tab ? ' is-active' : ''}`}
          aria-selected={activeTab === tab}
          onClick={() => onSelect(tab)}
        >
          {detailTabLabel(tab)}
        </button>
      ))}
    </nav>
  );
}

export function RegionContentPopover({
  target,
  cell,
  catalog,
  gridDesign,
  float,
  onUpdateCell,
  onBringFloatToFront,
  onSendFloatToBack,
  onRemoveFloat,
  onUpdateFloatField,
  onUpdateFloat,
  onClose,
  visualizerConfig,
  windowVisualizers,
  onVisualizerConfigChange,
}: RegionContentPopoverProps) {
  const isFloat = target.kind === 'float';
  const showFloatLayout = isFloat && float && onUpdateFloatField;

  const detailTabs = useMemo(
    () => availableDetailTabs(target, cell, Boolean(showFloatLayout)),
    [target, cell, showFloatLayout],
  );
  const hasDetailPanel = detailTabs.length > 0;

  const [activeTab, setActiveTab] = useState<RegionDetailTab | null>(() =>
    defaultDetailTab(target, availableDetailTabs(target, cell, Boolean(showFloatLayout)), cell),
  );
  const prevTargetKeyRef = useRef<string | null>(null);
  const targetKey = target.kind === 'float' ? `float:${target.id}` : `area:${target.areaNumber}`;

  const showHostPrimary = isHostContentKind(cell.slotA);
  const showHostSecondary = isHostContentKind(cell.slotB);
  const showSongPrimary = isSongConfigurableContent(cell.slotA);
  const showSongSecondary = isSongConfigurableContent(cell.slotB);
  const showVisualizerPrimary = cell.slotA === 'visualizer';
  const showVisualizerSecondary = cell.slotB === 'visualizer';

  const assignSlot = (slot: 'slotA' | 'slotB', value: VcCellContent) => {
    if (isFloatOnlyContent(value) && target.kind !== 'float') {
      return;
    }

    const patch: Partial<VcCellAssignment> = { [slot]: value };
    const prevContent = slot === 'slotA' ? cell.slotA : cell.slotB;

    if (isHostContentKind(value)) {
      if (slot === 'slotA') patch.songSlotA = null;
      else patch.songSlotB = null;
      const existing = slot === 'slotA' ? cell.hostSlotA : cell.hostSlotB;
      if (prevContent !== value || !existing) {
        const binding: VcHostSlotBinding = { itemId: '', overrides: {} };
        if (slot === 'slotA') patch.hostSlotA = binding;
        else patch.hostSlotB = binding;
      }
    } else {
      if (slot === 'slotA') patch.hostSlotA = null;
      else patch.hostSlotB = null;
    }

    if (isSongConfigurableContent(value)) {
      const existing = slot === 'slotA' ? cell.songSlotA : cell.songSlotB;
      if (prevContent !== value || !existing) {
        const settings: VcSongSlotSettings = { overrides: {} };
        if (slot === 'slotA') patch.songSlotA = settings;
        else patch.songSlotB = settings;
      }
    } else {
      if (slot === 'slotA') patch.songSlotA = null;
      else patch.songSlotB = null;
    }

    onUpdateCell(patch);
    if (slotHasDetailTab(value)) {
      setActiveTab(slot === 'slotA' ? 'primary' : 'secondary');
    }
  };

  useEffect(() => {
    const prev = prevTargetKeyRef.current;
    prevTargetKeyRef.current = targetKey;
    if (prev !== targetKey) {
      setActiveTab(defaultDetailTab(target, detailTabs, cell));
      return;
    }
    setActiveTab((current) => resolveDetailTab(current, target, detailTabs, cell));
  }, [targetKey, target, detailTabs, cell]);

  const layoutClass = [
    'vc-region-popover-layout',
    hasDetailPanel ? 'has-detail' : '',
    hasDetailPanel ? 'vc-region-popover-layout--with-tabs' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const popoverClass = [
    'vc-region-popover',
    hasDetailPanel ? 'has-detail' : '',
    hasDetailPanel ? 'vc-region-popover--with-tabs' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedTab = activeTab && detailTabs.includes(activeTab) ? activeTab : detailTabs[0] ?? null;

  return (
    <DesignerOverlayLayer
      ariaLabel={`${regionTitle(target)} content`}
      onClose={onClose}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      className={popoverClass}
    >
      <header className="vc-region-popover-header">
        <h3>{regionTitle(target)}</h3>
        <button type="button" className="vc-region-popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className={layoutClass}>
        {hasDetailPanel ? (
          <span className="vc-region-popover-slot-label">Primary content</span>
        ) : null}

        <div
          className={`vc-region-popover-main${hasDetailPanel ? ' vc-region-popover-main--with-tabs' : ''}`}
        >
          <ContentAssignmentFields
            cell={cell}
            onAssignSlot={assignSlot}
            onUpdateCell={onUpdateCell}
            allowFloatOnly={isFloat}
            showPrimaryLabel={!hasDetailPanel}
          />
        </div>

        {hasDetailPanel && resolvedTab ? (
          <div className="vc-region-popover-detail-column" aria-label="Region settings">
            <RegionDetailTabBar tabs={detailTabs} activeTab={resolvedTab} onSelect={setActiveTab} />
            <div className="vc-region-popover-tab-panel" role="tabpanel">
              {resolvedTab === 'layout' && showFloatLayout ? (
                <div className="vc-float-layout-detail">
                  <FloatLayoutDetail
                  float={float}
                  gridDesign={gridDesign}
                  onUpdateFloatField={onUpdateFloatField}
                  onUpdateFloat={onUpdateFloat}
                  onBringFloatToFront={onBringFloatToFront}
                  onSendFloatToBack={onSendFloatToBack}
                  onRemoveFloat={onRemoveFloat}
                />
                </div>
              ) : null}

              {resolvedTab === 'layout' && target.kind === 'area' ? (
                <AreaLayoutDetail cell={cell} gridDesign={gridDesign} onUpdateCell={onUpdateCell} />
              ) : null}

              {resolvedTab === 'primary' && showHostPrimary ? (
                <HostAssignmentDetail
                  content={cell.slotA}
                  binding={cell.hostSlotA}
                  catalog={catalog}
                  onChange={(binding) => onUpdateCell({ hostSlotA: binding })}
                />
              ) : null}

              {resolvedTab === 'primary' && showSongPrimary && cell.songSlotA ? (
                <SongAssignmentDetail
                  content={cell.slotA}
                  settings={cell.songSlotA}
                  catalog={catalog}
                  gridDesign={gridDesign}
                  onChange={(settings) => onUpdateCell({ songSlotA: settings })}
                />
              ) : null}

              {resolvedTab === 'primary' && showVisualizerPrimary ? (
                <VisualizerAssignmentSettings
                  visualizerId={visualizerConfig.visualizerId}
                  visualizerChangeRule={visualizerConfig.visualizerChangeRule}
                  visualizerSequence={visualizerConfig.visualizerSequence}
                  visualizerAlsoClickToChange={visualizerConfig.visualizerAlsoClickToChange === true}
                  showVisualizerName={visualizerConfig.showVisualizerName === true}
                  visualizers={windowVisualizers}
                  onChange={onVisualizerConfigChange}
                />
              ) : null}

              {resolvedTab === 'secondary' && showHostSecondary ? (
                <HostAssignmentDetail
                  content={cell.slotB}
                  binding={cell.hostSlotB}
                  catalog={catalog}
                  onChange={(binding) => onUpdateCell({ hostSlotB: binding })}
                />
              ) : null}

              {resolvedTab === 'secondary' && showSongSecondary && cell.songSlotB ? (
                <SongAssignmentDetail
                  content={cell.slotB}
                  settings={cell.songSlotB}
                  catalog={catalog}
                  gridDesign={gridDesign}
                  onChange={(settings) => onUpdateCell({ songSlotB: settings })}
                />
              ) : null}

              {resolvedTab === 'secondary' && showVisualizerSecondary ? (
                <VisualizerAssignmentSettings
                  visualizerId={visualizerConfig.visualizerId}
                  visualizerChangeRule={visualizerConfig.visualizerChangeRule}
                  visualizerSequence={visualizerConfig.visualizerSequence}
                  visualizerAlsoClickToChange={visualizerConfig.visualizerAlsoClickToChange === true}
                  showVisualizerName={visualizerConfig.showVisualizerName === true}
                  visualizers={windowVisualizers}
                  onChange={onVisualizerConfigChange}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </DesignerOverlayLayer>
  );
}
