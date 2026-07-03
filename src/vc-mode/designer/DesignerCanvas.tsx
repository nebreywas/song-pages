/**
 * Interactive 16:9 surface canvas for Designer mode.
 * Shows live content previews with editing chrome layered on top.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { applyDividerDrag, computeSurfaceLayout } from '@shared/vcSurface/geometry';
import { moveFloat, resizeFloat } from '@shared/vcSurface/floats';
import {
  emptyCell,
  type VcCellAssignment,
  type VcModeConfig,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { DesignerContentPreview } from './DesignerContentPreview';

export type DesignerSelection =
  | { kind: 'area'; areaNumber: number }
  | { kind: 'float'; id: string }
  | null;

type DesignerCanvasProps = {
  config: VcModeConfig;
  previewState: VcStatePayload | null;
  selection: DesignerSelection;
  onSelect: (selection: DesignerSelection) => void;
  onChangeSurface: (patch: Partial<VcModeConfig['surface']>) => void;
};

type DragState =
  | { type: 'divider'; key: string }
  | { type: 'float-move'; id: string; offsetX: number; offsetY: number }
  | { type: 'float-resize'; id: string }
  | null;

function activeContent(cell: VcCellAssignment) {
  return cell.slotA || cell.slotB || '';
}

function clientToNorm(
  event: { clientX: number; clientY: number },
  el: HTMLElement,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / Math.max(rect.width, 1),
    y: (event.clientY - rect.top) / Math.max(rect.height, 1),
  };
}

export function DesignerCanvas({
  config,
  previewState,
  selection,
  onSelect,
  onChangeSurface,
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

  // Window-level listeners so drags keep working when the pointer leaves the handle.
  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
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

    const onUp = () => setDrag(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag]);

  return (
    <div className="vc-designer-canvas-frame">
      <div
        ref={surfaceRef}
        className="vc-designer-canvas"
        onPointerDown={(event) => {
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
                event.stopPropagation();
                onSelect({ kind: 'area', areaNumber: area.areaNumber });
              }}
            >
              <DesignerContentPreview content={activeContent(cell)} state={previewState} />
              <span className="vc-designer-area-badge">Area {area.areaNumber}</span>
            </div>
          );
        })}

        {floats.map((float) => {
          const cell = config.floatContent[float.id] ?? emptyCell();
          const selected = selection?.kind === 'float' && selection.id === float.id;
          return (
            <div
              key={float.id}
              className={`vc-designer-region vc-designer-float${selected ? ' is-selected' : ''}`}
              style={{
                left: `${float.x * 100}%`,
                top: `${float.y * 100}%`,
                width: `${float.width * 100}%`,
                height: `${float.height * 100}%`,
                zIndex: 20 + float.zIndex,
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect({ kind: 'float', id: float.id });
                if (!surfaceRef.current) return;
                const norm = clientToNorm(event, surfaceRef.current);
                setDrag({
                  type: 'float-move',
                  id: float.id,
                  offsetX: norm.x - float.x,
                  offsetY: norm.y - float.y,
                });
              }}
            >
              <DesignerContentPreview content={activeContent(cell)} state={previewState} />
              <span className="vc-designer-area-badge">Float</span>
              <button
                type="button"
                className="vc-designer-resize-handle"
                aria-label="Resize float"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelect({ kind: 'float', id: float.id });
                  setDrag({ type: 'float-resize', id: float.id });
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
              style={
                isVertical
                  ? {
                      left: `${handle.position * 100}%`,
                      top: `${handle.region.y * 100}%`,
                      height: `${handle.region.height * 100}%`,
                    }
                  : {
                      top: `${handle.position * 100}%`,
                      left: `${handle.region.x * 100}%`,
                      width: `${handle.region.width * 100}%`,
                    }
              }
              onPointerDown={(event) => {
                event.stopPropagation();
                setDrag({ type: 'divider', key: handle.key });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
