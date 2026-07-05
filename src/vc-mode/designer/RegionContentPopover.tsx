/**
 * Centered content-assignment dialog over the designer canvas.
 *
 * Layout pattern (shared by future region detail panels):
 * - Left: primary assignment fields + section launcher buttons
 * - Right: detail panel when a launcher is active (float layout, etc.)
 */

import { useEffect, useState } from 'react';

import { hostContentTypeForSlot, listItemsByType, type HostContentCatalog } from '@shared/hostContent';
import type { VcGridDesignSettings } from '@shared/vcMode/gridDesign';
import type { VcFloatGeometry } from '@shared/vcSurface/floats';
import {
  isHostContentKind,
  isSongConfigurableContent,
  VC_CONTENT_LABELS,
  VC_CYCLE_OPTIONS,
  VC_HOST_CONTENT_OPTIONS,
  VC_SONG_CONTENT_OPTIONS,
  VC_TRANSITION_OPTIONS,
  type VcCellAssignment,
  type VcCellContent,
  type VcCycleTime,
  type VcHostSlotBinding,
  type VcSongSlotSettings,
  type VcTransitionStyle,
} from '@shared/vcModeTypes';

import { DesignerOverlayLayer } from './DesignerOverlayLayer';

export type RegionTarget =
  | { kind: 'area'; areaNumber: number }
  | { kind: 'float'; id: string; index: number };

/** Detail panels opened from the left-hand section nav. Extend for future sprints. */
type RegionDetailPanel =
  | 'float-layout'
  | 'host-primary'
  | 'host-secondary'
  | 'song-primary'
  | 'song-secondary';

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
  onClose: () => void;
};

function ContentSelect({
  value,
  onChange,
}: {
  value: VcCellContent;
  onChange: (value: VcCellContent) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as VcCellContent)}>
      <option value="">(blank)</option>
      <optgroup label="Song content">
        {VC_SONG_CONTENT_OPTIONS.map((opt) => (
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
}: {
  cell: VcCellAssignment;
  onAssignSlot: (slot: 'slotA' | 'slotB', value: VcCellContent) => void;
  onUpdateCell: (patch: Partial<VcCellAssignment>) => void;
}) {
  return (
    <>
      <label className="vc-field">
        <span>Primary content</span>
        <ContentSelect value={cell.slotA} onChange={(value) => onAssignSlot('slotA', value)} />
      </label>

      <label className="vc-field">
        <span>Secondary content</span>
        <ContentSelect value={cell.slotB} onChange={(value) => onAssignSlot('slotB', value)} />
      </label>

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

      <label className="vc-field">
        <span>Transition style</span>
        <select
          value={cell.transitionStyle}
          disabled={!cellNeedsCycle(cell)}
          onChange={(e) => onUpdateCell({ transitionStyle: e.target.value as VcTransitionStyle })}
        >
          {VC_TRANSITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function cellNeedsCycle(cell: VcCellAssignment): boolean {
  return cell.slotA !== '' && cell.slotB !== '';
}

function regionTitle(target: RegionTarget): string {
  return target.kind === 'area' ? `Area ${target.areaNumber}` : `Float ${target.index + 1}`;
}

import { HostAssignmentSettings } from './HostAssignmentSettings';
import { SongAssignmentSettings } from './SongAssignmentSettings';

function HostAssignmentDetail({
  slot,
  content,
  binding,
  catalog,
  onChange,
}: {
  slot: 'slotA' | 'slotB';
  content: VcCellContent;
  binding: VcHostSlotBinding | null;
  catalog: HostContentCatalog;
  onChange: (binding: VcHostSlotBinding | null) => void;
}) {
  const hostType = hostContentTypeForSlot(content);
  const items = hostType ? listItemsByType(catalog, hostType) : [];

  return (
    <>
      <header className="vc-region-popover-detail-header">
        <h4>{slot === 'slotA' ? 'Primary' : 'Secondary'} host content</h4>
      </header>
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
        binding={binding ?? { itemId: '', overrides: {} }}
        catalog={catalog}
        onChange={onChange}
      />
    </>
  );
}

function SongAssignmentDetail({
  slot,
  content,
  settings,
  catalog,
  gridDesign,
  onChange,
}: {
  slot: 'slotA' | 'slotB';
  content: VcCellContent;
  settings: VcSongSlotSettings;
  catalog: HostContentCatalog;
  gridDesign: VcGridDesignSettings;
  onChange: (settings: VcSongSlotSettings) => void;
}) {
  return (
    <>
      <header className="vc-region-popover-detail-header">
        <h4>{slot === 'slotA' ? 'Primary' : 'Secondary'} song content</h4>
      </header>
      <SongAssignmentSettings
        content={content}
        settings={settings}
        catalog={catalog}
        gridDesign={gridDesign}
        onChange={onChange}
      />
    </>
  );
}

function FloatLayoutDetail({
  float,
  onUpdateFloatField,
  onBringFloatToFront,
  onSendFloatToBack,
  onRemoveFloat,
}: {
  float: VcFloatGeometry;
  onUpdateFloatField: (field: 'x' | 'y' | 'width' | 'height', pct: number) => void;
  onBringFloatToFront?: () => void;
  onSendFloatToBack?: () => void;
  onRemoveFloat?: () => void;
}) {
  return (
    <>
      <header className="vc-region-popover-detail-header">
        <h4>Float layout</h4>
      </header>

      <div className="vc-float-numeric">
        {(['x', 'y', 'width', 'height'] as const).map((field) => (
          <label key={field} className="vc-field">
            <span>{field}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(float[field] * 100)}
              onChange={(e) => onUpdateFloatField(field, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="vc-region-popover-actions">
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
        {onRemoveFloat ? (
          <button type="button" className="btn" onClick={onRemoveFloat}>
            Remove float
          </button>
        ) : null}
      </div>
    </>
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
  onClose,
}: RegionContentPopoverProps) {
  const [activeDetail, setActiveDetail] = useState<RegionDetailPanel | null>(null);

  const isFloat = target.kind === 'float';
  const showFloatLayout = isFloat && float && onUpdateFloatField;
  const showHostPrimary = isHostContentKind(cell.slotA);
  const showHostSecondary = isHostContentKind(cell.slotB);
  const showSongPrimary = isSongConfigurableContent(cell.slotA);
  const showSongSecondary = isSongConfigurableContent(cell.slotB);
  const hasDetail = activeDetail !== null;

  const assignSlot = (slot: 'slotA' | 'slotB', value: VcCellContent) => {
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
    if (isHostContentKind(value)) {
      setActiveDetail(slot === 'slotA' ? 'host-primary' : 'host-secondary');
    } else if (isSongConfigurableContent(value)) {
      setActiveDetail(slot === 'slotA' ? 'song-primary' : 'song-secondary');
    }
  };

  useEffect(() => {
    setActiveDetail(null);
  }, [target]);

  const dismissOverlay = () => {
    if (activeDetail) {
      setActiveDetail(null);
      return;
    }
    onClose();
  };

  const toggleDetail = (panel: RegionDetailPanel) => {
    setActiveDetail((current) => (current === panel ? null : panel));
  };

  return (
    <DesignerOverlayLayer
      ariaLabel={`${regionTitle(target)} content`}
      onClose={dismissOverlay}
      className={`vc-region-popover${hasDetail ? ' has-detail' : ''}`}
    >
      <header className="vc-region-popover-header">
        <h3>{regionTitle(target)}</h3>
        <button type="button" className="vc-region-popover-close" onClick={dismissOverlay} aria-label="Close">
          ×
        </button>
      </header>

      <div className={`vc-region-popover-layout${hasDetail ? ' has-detail' : ''}`}>
          <div className="vc-region-popover-main">
            <ContentAssignmentFields
              cell={cell}
              onAssignSlot={assignSlot}
              onUpdateCell={onUpdateCell}
            />

            {showHostPrimary ? (
              <nav className="vc-region-popover-section-nav" aria-label="Host assignment">
                <button
                  type="button"
                  className={`btn vc-region-popover-section-btn${activeDetail === 'host-primary' ? ' is-active' : ''}`}
                  onClick={() => toggleDetail('host-primary')}
                >
                  Host content (primary)
                </button>
              </nav>
            ) : null}

            {showHostSecondary ? (
              <nav className="vc-region-popover-section-nav" aria-label="Host assignment secondary">
                <button
                  type="button"
                  className={`btn vc-region-popover-section-btn${activeDetail === 'host-secondary' ? ' is-active' : ''}`}
                  onClick={() => toggleDetail('host-secondary')}
                >
                  Host content (secondary)
                </button>
              </nav>
            ) : null}

            {showSongPrimary ? (
              <nav className="vc-region-popover-section-nav" aria-label="Song assignment">
                <button
                  type="button"
                  className={`btn vc-region-popover-section-btn${activeDetail === 'song-primary' ? ' is-active' : ''}`}
                  onClick={() => toggleDetail('song-primary')}
                >
                  {VC_CONTENT_LABELS[cell.slotA]} settings (primary)
                </button>
              </nav>
            ) : null}

            {showSongSecondary ? (
              <nav className="vc-region-popover-section-nav" aria-label="Song assignment secondary">
                <button
                  type="button"
                  className={`btn vc-region-popover-section-btn${activeDetail === 'song-secondary' ? ' is-active' : ''}`}
                  onClick={() => toggleDetail('song-secondary')}
                >
                  {VC_CONTENT_LABELS[cell.slotB]} settings (secondary)
                </button>
              </nav>
            ) : null}

            {showFloatLayout ? (
              <nav className="vc-region-popover-section-nav" aria-label="Region details">
                <button
                  type="button"
                  className={`btn vc-region-popover-section-btn${activeDetail === 'float-layout' ? ' is-active' : ''}`}
                  aria-expanded={activeDetail === 'float-layout'}
                  onClick={() => toggleDetail('float-layout')}
                >
                  Float layout
                </button>
              </nav>
            ) : null}
          </div>

          {activeDetail === 'host-primary' && showHostPrimary ? (
            <aside className="vc-region-popover-detail" aria-label="Host primary assignment">
              <HostAssignmentDetail
                slot="slotA"
                content={cell.slotA}
                binding={cell.hostSlotA}
                catalog={catalog}
                onChange={(binding) => onUpdateCell({ hostSlotA: binding })}
              />
            </aside>
          ) : null}

          {activeDetail === 'host-secondary' && showHostSecondary ? (
            <aside className="vc-region-popover-detail" aria-label="Host secondary assignment">
              <HostAssignmentDetail
                slot="slotB"
                content={cell.slotB}
                binding={cell.hostSlotB}
                catalog={catalog}
                onChange={(binding) => onUpdateCell({ hostSlotB: binding })}
              />
            </aside>
          ) : null}

          {activeDetail === 'song-primary' && showSongPrimary && cell.songSlotA ? (
            <aside className="vc-region-popover-detail" aria-label="Song primary assignment">
              <SongAssignmentDetail
                slot="slotA"
                content={cell.slotA}
                settings={cell.songSlotA}
                catalog={catalog}
                gridDesign={gridDesign}
                onChange={(settings) => onUpdateCell({ songSlotA: settings })}
              />
            </aside>
          ) : null}

          {activeDetail === 'song-secondary' && showSongSecondary && cell.songSlotB ? (
            <aside className="vc-region-popover-detail" aria-label="Song secondary assignment">
              <SongAssignmentDetail
                slot="slotB"
                content={cell.slotB}
                settings={cell.songSlotB}
                catalog={catalog}
                gridDesign={gridDesign}
                onChange={(settings) => onUpdateCell({ songSlotB: settings })}
              />
            </aside>
          ) : null}

          {activeDetail === 'float-layout' && showFloatLayout ? (
            <aside className="vc-region-popover-detail" aria-label="Float layout">
              <FloatLayoutDetail
                float={float}
                onUpdateFloatField={onUpdateFloatField}
                onBringFloatToFront={onBringFloatToFront}
                onSendFloatToBack={onSendFloatToBack}
                onRemoveFloat={onRemoveFloat}
              />
            </aside>
          ) : null}
        </div>
    </DesignerOverlayLayer>
  );
}
