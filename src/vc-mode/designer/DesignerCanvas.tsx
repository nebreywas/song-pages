/**
 * Interactive surface canvas for Designer mode.
 * Uses normalized 0–1 geometry (same as live VC); preview box fills available modal space.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { applyDividerDrag, computeSurfaceLayout } from '@shared/vcSurface/geometry';
import { moveFloat, resizeFloat } from '@shared/vcSurface/floats';
import { gridDividerCss, floatOutlineCss } from '@shared/vcMode/gridDesign';
import type { HostContentCatalog } from '@shared/hostContent';
import {
  emptyCell,
  type VcCellAssignment,
  type VcModeConfig,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { DesignerContentPreview, hostBindingForPreview, songBindingForPreview } from './DesignerContentPreview';
import { clientToNorm } from './designerPointer';
import type { RegionTarget } from './RegionContentPopover';

export type DesignerSelection =
  | { kind: 'area'; areaNumber: number }
  | { kind: 'float'; id: string }
  | null;

type DesignerCanvasProps = {
  config: VcModeConfig;
  hostCatalog: HostContentCatalog;
  previewState: VcStatePayload | null;
  selection: DesignerSelection;
  onSelect: (selection: DesignerSelection) => void;
  onChangeSurface: (patch: Partial<VcModeConfig['surface']>) => void;
  onRegionContextMenu: (target: RegionTarget, event: React.MouseEvent) => void;
};

type DragState =
  | { type: 'divider'; key: string; pointerId: number }
  | { type: 'float-move'; id: string; offsetX: number; offsetY: number; pointerId: number }
  | { type: 'float-resize'; id: string; pointerId: number }
  | null;

function activeContent(cell: VcCellAssignment) {
  return cell.slotA || cell.slotB || '';
}

/** Width × height as rounded whole percentages for designer badges. */
function formatRegionSize(width: number, height: number): string {
  return `${Math.round(width * 100)}% x ${Math.round(height * 100)}%`;
}

export function DesignerCanvas({
  config,
  hostCatalog,
  previewState,
  selection,
  onSelect,
  onChangeSurface,
  onRegionContextMenu,
}: DesignerCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  const onChangeSurfaceRef = useRef(onChangeSurface);
  const [drag, setDrag] = useState<DragState>(null);

  configRef.current = config;
  onChangeSurfaceRef.current = onChangeSurface;

  const layout = useMemo(
    () => computeSurfaceLayout(config.surface.templateId, config.surface.dividers),
    [config.surface.templateId, config.surface.dividers],
  );

  const floats = useMemo(
    () => [...config.surface.floats].sort((a, b) => a.zIndex - b.zIndex),
    [config.surface.floats],
  );

  const floatNumbers = useMemo(() => {
    const order = new Map<string, number>();
    config.surface.floats.forEach((float, index) => order.set(float.id, index + 1));
    return order;
  }, [config.surface.floats]);

  const endDrag = useCallback(() => {
    setDrag(null);
  }, []);

  const handleRegionContextMenu = useCallback(
    (target: RegionTarget, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onRegionContextMenu(target, event);
    },
    [onRegionContextMenu],
  );

  // Window-level pointer listeners — keep drags alive when the cursor leaves a region.
  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;

      const surface = surfaceRef.current;
      if (!surface) return;
      const current = configRef.current;
      const norm = clientToNorm(event, surface);

      if (drag.type === 'divider') {
        const currentLayout = computeSurfaceLayout(
          current.surface.templateId,
          current.surface.dividers,
        );
        const handle = currentLayout.dividers.find((d) => d.key === drag.key);
        const pointer = handle?.axis === 'vertical' ? norm.x : norm.y;
        onChangeSurfaceRef.current({
          dividers: applyDividerDrag(
            current.surface.templateId,
            current.surface.dividers,
            drag.key,
            pointer,
          ),
        });
        return;
      }

      if (drag.type === 'float-move') {
        const float = current.surface.floats.find((f) => f.id === drag.id);
        if (!float) return;
        const next = moveFloat(float, norm.x - drag.offsetX, norm.y - drag.offsetY);
        onChangeSurfaceRef.current({
          floats: current.surface.floats.map((f) => (f.id === drag.id ? next : f)),
        });
        return;
      }

      if (drag.type === 'float-resize') {
        const float = current.surface.floats.find((f) => f.id === drag.id);
        if (!float) return;
        const next = resizeFloat(float, norm.x - float.x, norm.y - float.y);
        onChangeSurfaceRef.current({
          floats: current.surface.floats.map((f) => (f.id === drag.id ? next : f)),
        });
      }
    };

    const onEnd = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      endDrag();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [drag, endDrag]);

  const beginPointerDrag = (event: React.PointerEvent, nextDrag: DragState) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(nextDrag);
  };

  return (
    <div
      className={`vc-designer-canvas-frame${drag ? ' is-dragging' : ''}`}
      style={{ '--vc-grid-bg': config.gridDesign.backgroundColor } as React.CSSProperties}
    >
      <div
        ref={surfaceRef}
        className="vc-designer-canvas"
        style={
          {
            background: config.gridDesign.backgroundColor,
            '--vc-grid-bg': config.gridDesign.backgroundColor,
          } as React.CSSProperties
        }
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (event.target === event.currentTarget) onSelect(null);
        }}
      >
        {layout.areas.map((area) => {
          const cell = config.cells[area.areaNumber - 1] ?? emptyCell();
          const selected =
            selection?.kind === 'area' && selection.areaNumber === area.areaNumber;
          return (
            <div
              key={`area-${area.areaNumber}`}
              className={`vc-designer-region${selected ? ' is-selected' : ''}`}
              style={{
                left: `${area.x * 100}%`,
                top: `${area.y * 100}%`,
                width: `${area.width * 100}%`,
                height: `${area.height * 100}%`,
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                onSelect({ kind: 'area', areaNumber: area.areaNumber });
              }}
              onContextMenu={(event) =>
                handleRegionContextMenu({ kind: 'area', areaNumber: area.areaNumber }, event)
              }
            >
              <div className="vc-designer-region-content">
                <DesignerContentPreview
                  content={activeContent(cell)}
                  hostBinding={hostBindingForPreview(cell, activeContent(cell))}
                  songBinding={songBindingForPreview(cell, activeContent(cell))}
                  hostCatalog={hostCatalog}
                  state={previewState}
                />
              </div>
              <span className="vc-designer-area-badge">
                Area {area.areaNumber} ({formatRegionSize(area.width, area.height)})
              </span>
            </div>
          );
        })}

        {floats.map((float) => {
          const cell = config.floatContent[float.id] ?? emptyCell();
          const selected = selection?.kind === 'float' && selection.id === float.id;
          const floatNumber = floatNumbers.get(float.id) ?? 1;
          const floatIndex = floatNumber - 1;
          return (
            <div
              key={float.id}
              className={`vc-designer-region vc-designer-float${selected ? ' is-selected' : ''}${drag?.type === 'float-move' && drag.id === float.id ? ' is-dragging' : ''}`}
              style={{
                left: `${float.x * 100}%`,
                top: `${float.y * 100}%`,
                width: `${float.width * 100}%`,
                height: `${float.height * 100}%`,
                zIndex: 40 + float.zIndex,
                ...floatOutlineCss(config.gridDesign.floatLines),
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                onSelect({ kind: 'float', id: float.id });
                if (!surfaceRef.current) return;
                const norm = clientToNorm(event, surfaceRef.current);
                beginPointerDrag(event, {
                  type: 'float-move',
                  id: float.id,
                  offsetX: norm.x - float.x,
                  offsetY: norm.y - float.y,
                  pointerId: event.pointerId,
                });
              }}
              onContextMenu={(event) =>
                handleRegionContextMenu(
                  { kind: 'float', id: float.id, index: floatIndex },
                  event,
                )
              }
            >
              <div className="vc-designer-region-content">
                <DesignerContentPreview
                  content={activeContent(cell)}
                  hostBinding={hostBindingForPreview(cell, activeContent(cell))}
                  songBinding={songBindingForPreview(cell, activeContent(cell))}
                  hostCatalog={hostCatalog}
                  state={previewState}
                />
              </div>
              <span className="vc-designer-area-badge">
                Float {floatNumber} ({formatRegionSize(float.width, float.height)})
              </span>
              <button
                type="button"
                className="vc-designer-resize-handle"
                aria-label="Resize float"
                onPointerDown={(event) => {
                  onSelect({ kind: 'float', id: float.id });
                  beginPointerDrag(event, {
                    type: 'float-resize',
                    id: float.id,
                    pointerId: event.pointerId,
                  });
                }}
              />
            </div>
          );
        })}

        {layout.dividers.map((handle) => {
          const isVertical = handle.axis === 'vertical';
          return (
            <div
              key={handle.key}
              className={`vc-designer-divider ${isVertical ? 'is-vertical' : 'is-horizontal'}`}
              style={{
                ...(isVertical
                  ? {
                      left: `${handle.position * 100}%`,
                      top: `${handle.region.y * 100}%`,
                      height: `${handle.region.height * 100}%`,
                    }
                  : {
                      top: `${handle.position * 100}%`,
                      left: `${handle.region.x * 100}%`,
                      width: `${handle.region.width * 100}%`,
                    }),
                ...gridDividerCss(isVertical ? 'vertical' : 'horizontal', config.gridDesign.gridLines),
              }}
              onPointerDown={(event) => {
                beginPointerDrag(event, {
                  type: 'divider',
                  key: handle.key,
                  pointerId: event.pointerId,
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
