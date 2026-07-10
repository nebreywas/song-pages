/**
 * Absolute positioning for template areas and floats.
 * Adds a 1px bleed so subpixel rounding does not leave hairline gaps between regions.
 */

import { clampRotationDeg } from './floats';

export type SurfaceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const EDGE_BLEED_DEFAULT_PX = 2;
/** Extra overlap when template dividers are hidden — closes hairline gaps at any DPI. */
export const EDGE_BLEED_SEAMLESS_PX = 8;

export type SurfaceRectStyleOptions = {
  edgeBleedPx?: number;
};

export function surfaceRectStyle(
  rect: SurfaceRect,
  options?: SurfaceRectStyleOptions,
): Record<string, string> {
  const edgeBleedPx = options?.edgeBleedPx ?? EDGE_BLEED_DEFAULT_PX;
  const leftPct = rect.x * 100;
  const topPct = rect.y * 100;
  const widthPct = rect.width * 100;
  const heightPct = rect.height * 100;

  return {
    position: 'absolute',
    left: rect.x > 0 ? `calc(${leftPct}% - ${edgeBleedPx}px)` : `${leftPct}%`,
    top: rect.y > 0 ? `calc(${topPct}% - ${edgeBleedPx}px)` : `${topPct}%`,
    width: `calc(${widthPct}% + ${edgeBleedPx}px)`,
    height: `calc(${heightPct}% + ${edgeBleedPx}px)`,
  };
}

/** Float container style — positioning plus optional clockwise rotation. */
export function surfaceFloatStyle(
  rect: SurfaceRect & { rotationDeg?: number },
  options?: SurfaceRectStyleOptions,
): Record<string, string> {
  const base = surfaceRectStyle(rect, options);
  const deg = clampRotationDeg(rect.rotationDeg);
  if (deg === 0) return base;
  return {
    ...base,
    transform: `rotate(${deg}deg)`,
    transformOrigin: 'center center',
  };
}
