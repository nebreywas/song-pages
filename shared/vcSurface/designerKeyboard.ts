/**
 * Arrow-key nudge helpers for the VC Surface designer — 1 CSS pixel per key press.
 */

import { applyDividerDrag, computeSurfaceLayout, type VcAreaRect, type VcDividerHandle, type VcSurfaceLayout } from './geometry';
import { moveFloat, type VcFloatGeometry } from './floats';
import type { VcTemplateId } from './templates';

export type NudgeDirection = 'left' | 'right' | 'up' | 'down';

export type SurfacePixelSize = {
  widthPx: number;
  heightPx: number;
};

/** Normalized 1px delta along surface X/Y. */
export function onePixelNorm(size: SurfacePixelSize): { x: number; y: number } {
  return {
    x: size.widthPx > 0 ? 1 / size.widthPx : 0,
    y: size.heightPx > 0 ? 1 / size.heightPx : 0,
  };
}

function rectsOverlapY(a: VcAreaRect, region: { y: number; height: number }): boolean {
  return a.y < region.y + region.height && a.y + a.height > region.y;
}

function rectsOverlapX(a: VcAreaRect, region: { x: number; width: number }): boolean {
  return a.x < region.x + region.width && a.x + a.width > region.x;
}

function dividerTouchesArea(handle: VcDividerHandle, area: VcAreaRect, edgeEpsilon: number): boolean {
  if (handle.axis === 'vertical') {
    const onLeft = Math.abs(handle.position - area.x) <= edgeEpsilon;
    const onRight = Math.abs(handle.position - (area.x + area.width)) <= edgeEpsilon;
    return (onLeft || onRight) && rectsOverlapY(area, handle.region);
  }

  const onTop = Math.abs(handle.position - area.y) <= edgeEpsilon;
  const onBottom = Math.abs(handle.position - (area.y + area.height)) <= edgeEpsilon;
  return (onTop || onBottom) && rectsOverlapX(area, handle.region);
}

/**
 * Divider on the selected area edge that should move for this arrow direction.
 * Left → left-edge vertical, Right → right-edge vertical, etc.
 */
export function findDividerKeyForAreaNudge(
  layout: VcSurfaceLayout,
  areaNumber: number,
  direction: NudgeDirection,
  edgeEpsilon: number,
): string | null {
  const area = layout.areas.find((a) => a.areaNumber === areaNumber);
  if (!area) return null;

  for (const handle of layout.dividers) {
    if (!dividerTouchesArea(handle, area, edgeEpsilon)) continue;

    if (direction === 'left' && handle.axis === 'vertical' && Math.abs(handle.position - area.x) <= edgeEpsilon) {
      return handle.key;
    }
    if (
      direction === 'right' &&
      handle.axis === 'vertical' &&
      Math.abs(handle.position - (area.x + area.width)) <= edgeEpsilon
    ) {
      return handle.key;
    }
    if (direction === 'up' && handle.axis === 'horizontal' && Math.abs(handle.position - area.y) <= edgeEpsilon) {
      return handle.key;
    }
    if (
      direction === 'down' &&
      handle.axis === 'horizontal' &&
      Math.abs(handle.position - (area.y + area.height)) <= edgeEpsilon
    ) {
      return handle.key;
    }
  }

  return null;
}

export function nudgeDivider(
  templateId: VcTemplateId | string,
  dividers: Record<string, number>,
  key: string,
  deltaNorm: number,
): Record<string, number> {
  const layout = computeSurfaceLayout(templateId, dividers);
  const handle = layout.dividers.find((d) => d.key === key);
  if (!handle) return layout.resolvedDividers;

  const nextPos = Math.min(handle.max, Math.max(handle.min, handle.position + deltaNorm));
  return applyDividerDrag(templateId, layout.resolvedDividers, key, nextPos);
}

export function nudgeFloat(float: VcFloatGeometry, deltaX: number, deltaY: number): VcFloatGeometry {
  return moveFloat(float, float.x + deltaX, float.y + deltaY);
}

export function arrowKeyToDirection(key: string): NudgeDirection | null {
  switch (key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    default:
      return null;
  }
}

export function directionDelta(
  direction: NudgeDirection,
  pixel: { x: number; y: number },
): { x: number; y: number } {
  switch (direction) {
    case 'left':
      return { x: -pixel.x, y: 0 };
    case 'right':
      return { x: pixel.x, y: 0 };
    case 'up':
      return { x: 0, y: -pixel.y };
    case 'down':
      return { x: 0, y: pixel.y };
  }
}

export function dividerDeltaForDirection(direction: NudgeDirection, pixel: { x: number; y: number }): number {
  switch (direction) {
    case 'left':
    case 'right':
      return direction === 'left' ? -pixel.x : pixel.x;
    case 'up':
    case 'down':
      return direction === 'up' ? -pixel.y : pixel.y;
  }
}
