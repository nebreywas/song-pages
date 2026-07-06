/**
 * Presentation-mode VC surface: base template areas + floats.
 * Optional layout mode (⌘⌥L) enables move/resize without designer chrome.
 */

import { useMemo } from 'react';

import { computeSurfaceLayout } from '@shared/vcSurface/geometry';
import {
  gridDividerCss,
  floatOutlineCssForFloat,
  floatAppearanceCss,
  hasActiveFullscreenGraphic,
  regionHasBorderOverride,
  regionOutlineCss,
  resolveAreaBackgroundColor,
  resolveLyricsFadeBackground,
} from '@shared/vcMode/gridDesign';
import type { HostContentCatalog } from '@shared/hostContent';
import {
  emptyCell,
  normalizeVcConfig,
  type VcModeConfig,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { VcCell } from './VcCell';
import { VcFullscreenGraphicLayer } from './VcFullscreenGraphicLayer';
import { useVcLayoutInteraction, type VcLayoutSelection } from './useVcLayoutInteraction';
import { clientToNorm } from '../vc-mode/designer/designerPointer';

type VcSurfaceProps = {
  state: VcStatePayload;
  hostCatalog: HostContentCatalog;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
  debugOutlines?: boolean;
  layoutMode?: boolean;
  onChangeSurface?: (patch: Partial<VcModeConfig['surface']>) => void;
};

function rectStyle(rect: { x: number; y: number; width: number; height: number }): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };
}

/** Width × height as rounded whole percentages for layout badges. */
function formatRegionSize(width: number, height: number): string {
  return `${Math.round(width * 100)}% × ${Math.round(height * 100)}%`;
}

/** Wide grab strip for layout mode — grid lines are often 0–1px and ungrabbable fullscreen. */
const LAYOUT_DIVIDER_HIT_PX = 16;

function layoutDividerStyle(isVertical: boolean): React.CSSProperties {
  const visual = 5;
  const half = visual / 2;
  const center = LAYOUT_DIVIDER_HIT_PX / 2;
  if (isVertical) {
    return {
      width: LAYOUT_DIVIDER_HIT_PX,
      background: `linear-gradient(to right, transparent ${center - half}px, #ff8800 ${center - half}px, #ff8800 ${center + half}px, transparent ${center + half}px)`,
      border: 'none',
      pointerEvents: 'auto',
    };
  }
  return {
    height: LAYOUT_DIVIDER_HIT_PX,
    background: `linear-gradient(to bottom, transparent ${center - half}px, #ff8800 ${center - half}px, #ff8800 ${center + half}px, transparent ${center + half}px)`,
    border: 'none',
    pointerEvents: 'auto',
  };
}

export function VcSurface({
  state,
  hostCatalog,
  frequencyData,
  frame,
  canvasFrame,
  debugOutlines = false,
  layoutMode = false,
  onChangeSurface,
}: VcSurfaceProps) {
  const config = useMemo(() => normalizeVcConfig(state.config), [state.config]);
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

  const {
    surfaceRef,
    frameRef,
    selection,
    setSelection,
    drag,
    beginPointerDrag,
    handleArrowNudge,
  } = useVcLayoutInteraction({
    config,
    enabled: layoutMode,
    onChangeSurface: onChangeSurface ?? (() => {}),
  });

  const debugClass = debugOutlines ? ' vc-debug-outline' : '';
  const layoutClass = layoutMode ? ' vc-layout-mode' : '';
  const draggingClass = drag ? ' is-dragging' : '';

  const regionSelected = (target: VcLayoutSelection): boolean => {
    if (!selection || !target) return false;
    if (selection.kind === 'area' && target.kind === 'area') {
      return selection.areaNumber === target.areaNumber;
    }
    if (selection.kind === 'float' && target.kind === 'float') {
      return selection.id === target.id;
    }
    return false;
  };

  return (
    <div
      ref={frameRef}
      tabIndex={layoutMode ? 0 : undefined}
      role={layoutMode ? 'application' : undefined}
      aria-label={layoutMode ? 'VC surface layout editor' : undefined}
      className={`vc-surface-frame${layoutClass}${draggingClass}`}
      onKeyDown={layoutMode ? handleArrowNudge : undefined}
    >
      <div
        ref={surfaceRef}
        className={`vc-surface${debugOutlines ? ' vc-surface-debug' : ''}${layoutClass}${
          hasActiveFullscreenGraphic(config.gridDesign) ? ' vc-has-fullscreen-graphic' : ''
        }`}
        style={
          {
            background: config.gridDesign.backgroundColor,
            '--vc-grid-bg': config.gridDesign.backgroundColor,
          } as React.CSSProperties
        }
        onPointerDown={
          layoutMode
            ? (event) => {
                if (event.button !== 0) return;
                if (event.target === event.currentTarget) setSelection(null);
              }
            : undefined
        }
      >
        <VcFullscreenGraphicLayer gridDesign={config.gridDesign} catalog={hostCatalog} />
        {layout.areas.map((area) => {
          const cell = config.cells[area.areaNumber - 1] ?? emptyCell();
          const selected = regionSelected({ kind: 'area', areaNumber: area.areaNumber });
          const areaBackground = resolveAreaBackgroundColor(cell, config.gridDesign);
          return (
            <div
              key={`area-${area.areaNumber}`}
              className={`vc-surface-region${debugClass}${layoutMode ? ' vc-layout-region' : ''}${selected ? ' is-layout-selected' : ''}`}
              style={{
                ...rectStyle(area),
                background: areaBackground,
                '--vc-lyrics-fade-bg': resolveLyricsFadeBackground(
                  areaBackground,
                  config.gridDesign.backgroundColor,
                ),
                ...(layoutMode || !regionHasBorderOverride(cell)
                  ? {}
                  : regionOutlineCss(cell, config.gridDesign)),
              } as React.CSSProperties}
              data-debug-label={debugOutlines ? `Area ${area.areaNumber}` : undefined}
              onPointerDown={
                layoutMode
                  ? (event) => {
                      if (event.button !== 0) return;
                      event.stopPropagation();
                      setSelection({ kind: 'area', areaNumber: area.areaNumber });
                    }
                  : undefined
              }
            >
              <div className={`vc-region-content${layoutMode ? ' vc-layout-region-content' : ''}`}>
                <VcCell
                  cell={cell}
                  hostCatalog={hostCatalog}
                  state={state}
                  frequencyData={frequencyData}
                  frame={frame}
                  canvasFrame={canvasFrame}
                  interactionDisabled={layoutMode}
                />
              </div>
              {layoutMode ? (
                <span className="vc-layout-region-badge">
                  Area {area.areaNumber} ({formatRegionSize(area.width, area.height)})
                </span>
              ) : null}
            </div>
          );
        })}

        {floats.map((float) => {
          const cell = config.floatContent[float.id] ?? emptyCell();
          const appearance = floatAppearanceCss(float, config.gridDesign);
          const floatNumber = floatNumbers.get(float.id) ?? 1;
          const selected = regionSelected({ kind: 'float', id: float.id });
          const isDragging = drag?.type === 'float-move' && drag.id === float.id;
          const floatBackground =
            typeof appearance.region.background === 'string' ? appearance.region.background : undefined;
          return (
            <div
              key={float.id}
              className={`vc-surface-region vc-surface-float${debugClass}${layoutMode ? ' vc-layout-region vc-layout-float' : ''}${selected ? ' is-layout-selected' : ''}${isDragging ? ' is-layout-dragging' : ''}`}
              style={{
                ...rectStyle(float),
                zIndex: layoutMode ? 40 + float.zIndex : 10 + float.zIndex,
                ...(layoutMode ? {} : floatOutlineCssForFloat(float, config.gridDesign)),
                ...appearance.region,
                '--vc-lyrics-fade-bg': resolveLyricsFadeBackground(
                  floatBackground,
                  config.gridDesign.backgroundColor,
                ),
              } as React.CSSProperties}
              data-debug-label={debugOutlines ? `Float ${floatNumber}` : undefined}
              onPointerDown={
                layoutMode
                  ? (event) => {
                      if (event.button !== 0) return;
                      setSelection({ kind: 'float', id: float.id });
                      if (!surfaceRef.current) return;
                      const norm = clientToNorm(event, surfaceRef.current);
                      beginPointerDrag(event, {
                        type: 'float-move',
                        id: float.id,
                        offsetX: norm.x - float.x,
                        offsetY: norm.y - float.y,
                        pointerId: event.pointerId,
                      });
                    }
                  : undefined
              }
            >
              <div
                className={`vc-region-content vc-float-content${layoutMode ? ' vc-layout-region-content' : ''}`}
                style={appearance.content}
              >
                <VcCell
                  cell={cell}
                  hostCatalog={hostCatalog}
                  state={state}
                  frequencyData={frequencyData}
                  frame={frame}
                  canvasFrame={canvasFrame}
                  isFloat
                  interactionDisabled={layoutMode}
                />
              </div>
              {layoutMode ? (
                <>
                  <span className="vc-layout-region-badge">
                    Float {floatNumber} ({formatRegionSize(float.width, float.height)})
                  </span>
                  <button
                    type="button"
                    className="vc-layout-resize-handle"
                    aria-label="Resize float"
                    onPointerDown={(event) => {
                      setSelection({ kind: 'float', id: float.id });
                      beginPointerDrag(event, {
                        type: 'float-resize',
                        id: float.id,
                        pointerId: event.pointerId,
                      });
                    }}
                  />
                </>
              ) : null}
            </div>
          );
        })}

        {layout.dividers.map((handle) => {
          const isVertical = handle.axis === 'vertical';
          const dividerStyle = layoutMode
            ? layoutDividerStyle(isVertical)
            : gridDividerCss(isVertical ? 'vertical' : 'horizontal', config.gridDesign.gridLines);
          return (
            <div
              key={handle.key}
              className={`vc-surface-divider ${isVertical ? 'is-vertical' : 'is-horizontal'}${layoutMode ? ' vc-layout-divider' : ''}`}
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
                ...dividerStyle,
              }}
              onPointerDown={
                layoutMode
                  ? (event) => {
                      event.stopPropagation();
                      beginPointerDrag(event, {
                        type: 'divider',
                        key: handle.key,
                        pointerId: event.pointerId,
                      });
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
