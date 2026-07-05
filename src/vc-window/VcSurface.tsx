/**
 * Presentation-mode VC surface: base template areas + floats.
 * No designer chrome — overlays are rendered separately by VcOverlays.
 */

import { useMemo } from 'react';

import { computeSurfaceLayout } from '@shared/vcSurface/geometry';
import { gridDividerCss, floatOutlineCss } from '@shared/vcMode/gridDesign';
import type { HostContentCatalog } from '@shared/hostContent';
import {
  emptyCell,
  normalizeVcConfig,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { VcCell } from './VcCell';

type VcSurfaceProps = {
  state: VcStatePayload;
  hostCatalog: HostContentCatalog;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
  debugOutlines?: boolean;
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

export function VcSurface({
  state,
  hostCatalog,
  frequencyData,
  frame,
  canvasFrame,
  debugOutlines = false,
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

  const debugClass = debugOutlines ? ' vc-debug-outline' : '';

  return (
    <div
      className={`vc-surface${debugOutlines ? ' vc-surface-debug' : ''}`}
      style={
        {
          background: config.gridDesign.backgroundColor,
          '--vc-grid-bg': config.gridDesign.backgroundColor,
        } as React.CSSProperties
      }
    >
      {layout.areas.map((area) => {
        const cell = config.cells[area.areaNumber - 1] ?? emptyCell();
        return (
          <div
            key={`area-${area.areaNumber}`}
            className={`vc-surface-region${debugClass}`}
            style={rectStyle(area)}
            data-debug-label={debugOutlines ? `Area ${area.areaNumber}` : undefined}
          >
            <VcCell
              cell={cell}
              hostCatalog={hostCatalog}
              state={state}
              frequencyData={frequencyData}
              frame={frame}
              canvasFrame={canvasFrame}
            />
          </div>
        );
      })}

      {floats.map((float, index) => {
        const cell = config.floatContent[float.id] ?? emptyCell();
        return (
          <div
            key={float.id}
            className={`vc-surface-region vc-surface-float${debugClass}`}
            style={{
              ...rectStyle(float),
              zIndex: 10 + float.zIndex,
              ...floatOutlineCss(config.gridDesign.floatLines),
            }}
            data-debug-label={debugOutlines ? `Float ${index + 1}` : undefined}
          >
            <VcCell
              cell={cell}
              hostCatalog={hostCatalog}
              state={state}
              frequencyData={frequencyData}
              frame={frame}
              canvasFrame={canvasFrame}
            />
          </div>
        );
      })}

      {layout.dividers.map((handle) => {
        const isVertical = handle.axis === 'vertical';
        return (
          <div
            key={handle.key}
            className={`vc-surface-divider ${isVertical ? 'is-vertical' : 'is-horizontal'}`}
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
          />
        );
      })}
    </div>
  );
}
