/** Shared pointer helpers for the Surface designer canvas. */

export function clientToNorm(
  event: { clientX: number; clientY: number },
  el: HTMLElement,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / Math.max(rect.width, 1),
    y: (event.clientY - rect.top) / Math.max(rect.height, 1),
  };
}
