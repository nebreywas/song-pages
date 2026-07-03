/**
 * Float geometry helpers — create, clamp, stack. Floats are independent of base template geometry.
 */

import {
  VC_DEFAULT_FLOAT_INSET,
  VC_DEFAULT_FLOAT_SIZE,
  VC_MAX_FLOATS,
  VC_MIN_FLOAT,
} from './constants';

export type VcFloatGeometry = {
  id: string;
  /** Normalized 0–1 of surface width. */
  width: number;
  /** Normalized 0–1 of surface height. */
  height: number;
  /** Top-left X, normalized 0–1. */
  x: number;
  /** Top-left Y, normalized 0–1. */
  y: number;
  zIndex: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp float size and position so it stays fully inside the surface. */
export function clampFloat(float: VcFloatGeometry): VcFloatGeometry {
  const width = clamp(float.width, VC_MIN_FLOAT, 1);
  const height = clamp(float.height, VC_MIN_FLOAT, 1);
  const x = clamp(float.x, 0, 1 - width);
  const y = clamp(float.y, 0, 1 - height);
  const zIndex = Number.isFinite(float.zIndex) ? float.zIndex : 1;
  return { id: float.id, width, height, x, y, zIndex };
}

export function canAddFloat(floats: VcFloatGeometry[]): boolean {
  return floats.length < VC_MAX_FLOATS;
}

/** Create a float at bottom-right with default size. Returns null if at capacity. */
export function createFloat(existing: VcFloatGeometry[]): VcFloatGeometry | null {
  if (!canAddFloat(existing)) return null;

  const usedIds = new Set(existing.map((f) => f.id));
  let n = 1;
  while (usedIds.has(`float-${n}`)) n += 1;

  const maxZ = existing.reduce((max, f) => Math.max(max, f.zIndex), 0);
  const width = VC_DEFAULT_FLOAT_SIZE;
  const height = VC_DEFAULT_FLOAT_SIZE;

  return clampFloat({
    id: `float-${n}`,
    width,
    height,
    x: 1 - width - VC_DEFAULT_FLOAT_INSET,
    y: 1 - height - VC_DEFAULT_FLOAT_INSET,
    zIndex: maxZ + 1,
  });
}

export function moveFloat(float: VcFloatGeometry, x: number, y: number): VcFloatGeometry {
  return clampFloat({ ...float, x, y });
}

export function resizeFloat(
  float: VcFloatGeometry,
  width: number,
  height: number,
  anchor: 'top-left' | 'bottom-right' = 'top-left',
): VcFloatGeometry {
  if (anchor === 'top-left') {
    return clampFloat({ ...float, width, height });
  }
  // Keep bottom-right corner fixed while resizing from top-left handle (not used yet).
  const right = float.x + float.width;
  const bottom = float.y + float.height;
  const next = clampFloat({ ...float, width, height });
  return clampFloat({
    ...next,
    x: right - next.width,
    y: bottom - next.height,
  });
}

/** Bring float to front (highest zIndex). */
export function bringFloatToFront(floats: VcFloatGeometry[], id: string): VcFloatGeometry[] {
  const maxZ = floats.reduce((max, f) => Math.max(max, f.zIndex), 0);
  return floats.map((f) => (f.id === id ? { ...f, zIndex: maxZ + 1 } : f));
}

/** Send float to back (lowest zIndex). */
export function sendFloatToBack(floats: VcFloatGeometry[], id: string): VcFloatGeometry[] {
  const minZ = floats.reduce((min, f) => Math.min(min, f.zIndex), 0);
  return floats.map((f) => (f.id === id ? { ...f, zIndex: minZ - 1 } : f));
}

export function sanitizeFloats(raw: unknown): VcFloatGeometry[] {
  if (!Array.isArray(raw)) return [];
  const floats: VcFloatGeometry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Partial<VcFloatGeometry> & {
      widthPct?: number;
      heightPct?: number;
      xPct?: number;
      yPct?: number;
    };
    const id = typeof value.id === 'string' && value.id ? value.id : `float-${floats.length + 1}`;

    // Accept either normalized 0–1 or percentage 0–100 from older/spec examples.
    const toNorm = (n: unknown, fallback: number) => {
      if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
      return n > 1 ? n / 100 : n;
    };

    floats.push(
      clampFloat({
        id,
        width: toNorm(value.width ?? value.widthPct, VC_DEFAULT_FLOAT_SIZE),
        height: toNorm(value.height ?? value.heightPct, VC_DEFAULT_FLOAT_SIZE),
        x: toNorm(value.x ?? value.xPct, 0),
        y: toNorm(value.y ?? value.yPct, 0),
        zIndex: typeof value.zIndex === 'number' ? value.zIndex : floats.length + 1,
      }),
    );
    if (floats.length >= VC_MAX_FLOATS) break;
  }
  return floats;
}
