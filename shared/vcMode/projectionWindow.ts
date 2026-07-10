/**
 * VC projection window bounds — stored per surface design so hosts can tune
 * layouts against their target capture / display size.
 */

export const VC_PROJECTION_WINDOW_MIN_WIDTH = 800;
export const VC_PROJECTION_WINDOW_MIN_HEIGHT = 500;

export type VcProjectionWindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** When true, reopen in OS fullscreen (windowed bounds are still kept for exit). */
  isFullScreen?: boolean;
};

function clampDimension(value: unknown, min: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.round(Math.max(min, value));
}

function clampPosition(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.round(value);
}

/** Normalize persisted projection window bounds. */
export function sanitizeProjectionWindow(raw: unknown): VcProjectionWindowBounds | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Partial<VcProjectionWindowBounds>;
  const width = clampDimension(value.width, VC_PROJECTION_WINDOW_MIN_WIDTH);
  const height = clampDimension(value.height, VC_PROJECTION_WINDOW_MIN_HEIGHT);
  const x = clampPosition(value.x);
  const y = clampPosition(value.y);
  if (width === undefined || height === undefined || x === undefined || y === undefined) {
    return undefined;
  }
  return {
    x,
    y,
    width,
    height,
    ...(value.isFullScreen === true ? { isFullScreen: true } : {}),
  };
}
