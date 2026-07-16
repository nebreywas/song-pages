/**
 * Presentation-mode VC surface: base template areas + floats.
 * Optional layout mode (⌘⌥L) enables move/resize without designer chrome.
 */

import { useMemo } from 'react';

import { computeSurfaceLayout } from '@shared/vcSurface/geometry';
import { resetFloatRotation } from '@shared/vcSurface/floats';
import { surfaceRectStyle, surfaceFloatStyle, EDGE_BLEED_SEAMLESS_PX } from '@shared/vcSurface/surfaceRectStyle';
import {
  areGridLinesVisible,
  gridDividerCss,
  floatOutlineCssForFloat,
  floatAppearanceCss,
  hasActiveFullscreenGraphic,
  isRegionBorderVisible,
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
  layoutMode?: boolean;
  onChangeSurface?: (patch: Partial<VcModeConfig['surface']>) => void;
};

function rectStyle(
  rect: { x: number; y: number; width: number; height: number; rotationDeg?: number },
  edgeBleedPx: number,
): React.CSSProperties {
  return surfaceFloatStyle(rect, { edgeBleedPx });
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
    cancelDrag,
    handleArrowNudge,
  } = useVcLayoutInteraction({
    config,
    enabled: layoutMode,
    onChangeSurface: onChangeSurface ?? (() => {}),
  });

  const layoutClass = layoutMode ? ' vc-layout-mode' : '';
  const draggingClass = drag ? ' is-dragging' : '';
  const gridLinesHiddenClass = areGridLinesVisible(config.gridDesign.gridLines)
    ? ''
    : ' vc-grid-lines-hidden';
  const regionEdgeBleedPx = areGridLinesVisible(config.gridDesign.gridLines)
    ? 2
    : EDGE_BLEED_SEAMLESS_PX;
  const fullscreenGraphic = hasActiveFullscreenGraphic(config.gridDesign);
  const surfaceBackground = fullscreenGraphic ? 'transparent' : config.gridDesign.backgroundColor;

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
        className={`vc-surface${layoutClass}${gridLinesHiddenClass}${
          fullscreenGraphic ? ' vc-has-fullscreen-graphic' : ''
        }`}
        style={
          {
            background: surfaceBackground,
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
              className={`vc-surface-region${layoutMode ? ' vc-layout-region' : ''}${selected ? ' is-layout-selected' : ''}`}
              style={{
                ...rectStyle(area, regionEdgeBleedPx),
                background: areaBackground,
                '--vc-lyrics-fade-bg': resolveLyricsFadeBackground(
                  areaBackground,
                  config.gridDesign.backgroundColor,
                ),
                ...(layoutMode
                  || !regionHasBorderOverride(cell)
                  || !isRegionBorderVisible(cell, config.gridDesign)
                  ? {}
                  : regionOutlineCss(cell, config.gridDesign)),
              } as React.CSSProperties}
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
                  regionLabel={`Area ${area.areaNumber}`}
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
              className={`vc-surface-region vc-surface-float${layoutMode ? ' vc-layout-region vc-layout-float' : ''}${selected ? ' is-layout-selected' : ''}${isDragging ? ' is-layout-dragging' : ''}`}
              style={{
                ...rectStyle(float, regionEdgeBleedPx),
                zIndex: layoutMode ? 40 + float.zIndex : 10 + float.zIndex,
                ...(layoutMode || !isRegionBorderVisible(float, config.gridDesign)
                  ? {}
                  : floatOutlineCssForFloat(float, config.gridDesign)),
                ...appearance.region,
                '--vc-lyrics-fade-bg': resolveLyricsFadeBackground(
                  floatBackground,
                  config.gridDesign.backgroundColor,
                ),
              } as React.CSSProperties}
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
                        startRotationDeg: float.rotationDeg ?? 0,
                        startNormY: norm.y,
                      });
                    }
                  : undefined
              }
              onDoubleClick={
                layoutMode && selected
                  ? (event) => {
                      if (!event.shiftKey) return;
                      event.preventDefault();
                      event.stopPropagation();
                      cancelDrag();
                      onChangeSurface?.({
                        floats: config.surface.floats.map((f) =>
                          f.id === float.id ? resetFloatRotation(f) : f,
                        ),
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
                  regionLabel={`Float ${floatNumber}`}
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

        {areGridLinesVisible(config.gridDesign.gridLines) || layoutMode
          ? layout.dividers.map((handle) => {
          const isVertical = handle.axis === 'vertical';
          const lines = config.gridDesign.gridLines;
          if (!layoutMode && !areGridLinesVisible(lines)) return null;
          const dividerStyle = layoutMode
            ? layoutDividerStyle(isVertical)
            : gridDividerCss(isVertical ? 'vertical' : 'horizontal', lines);
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
        })
          : null}
      </div>
    </div>
  );
}
