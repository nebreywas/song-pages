/**
 * Fit a fixed-position context menu inside the viewport.
 * Prefer opening at (x, y); if it would hang off the bottom, place it above the click.
 */

const VIEWPORT_PAD_PX = 8;

export type Point = { x: number; y: number };

export function clampFixedMenuPosition(
  el: HTMLElement,
  preferred: Point,
  pad = VIEWPORT_PAD_PX,
): { left: number; top: number } {
  const { width, height } = el.getBoundingClientRect();
  let left = preferred.x;
  let top = preferred.y;

  if (left + width > window.innerWidth - pad) {
    left = window.innerWidth - pad - width;
  }
  left = Math.max(pad, left);

  // Flip above the click when there isn't room below.
  if (top + height > window.innerHeight - pad) {
    top = preferred.y - height;
  }
  top = Math.max(pad, Math.min(top, window.innerHeight - pad - height));

  return { left, top };
}
