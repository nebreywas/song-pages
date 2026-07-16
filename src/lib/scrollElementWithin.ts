/**
 * Scroll a child into view inside its scrollable ancestor only —
 * avoids scrollIntoView() also shifting Electron/document chrome.
 */

function findVerticalScrollParent(from: HTMLElement, root: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = from.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1;
    if (canScroll) return node;
    if (root && node === root) break;
    node = node.parentElement;
  }
  return null;
}

/** Pin the page/root so a misplaced scrollIntoView cannot leave a dead band at the bottom. */
export function resetDocumentScroll(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const root = document.getElementById('root');
  if (root) root.scrollTop = 0;
}

/**
 * Center (or nearest-fit) `element` inside its nearest scroll parent under `root`.
 * Falls back to no-op when no scroll parent exists.
 */
export function scrollElementWithin(
  element: HTMLElement,
  root: HTMLElement | null = null,
  options: { block?: 'center' | 'nearest'; behavior?: ScrollBehavior } = {},
): void {
  const block = options.block ?? 'center';
  const behavior = options.behavior ?? 'smooth';
  const container = findVerticalScrollParent(element, root);
  if (!container) {
    resetDocumentScroll();
    return;
  }

  const elRect = element.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const offsetTop = elRect.top - cRect.top + container.scrollTop;
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

  let nextTop: number;
  if (block === 'center') {
    nextTop = offsetTop - container.clientHeight / 2 + elRect.height / 2;
  } else {
    // nearest — only move when the row is outside the visible band
    const visibleTop = container.scrollTop;
    const visibleBottom = visibleTop + container.clientHeight;
    const elTop = offsetTop;
    const elBottom = offsetTop + elRect.height;
    if (elTop < visibleTop) nextTop = elTop;
    else if (elBottom > visibleBottom) nextTop = elBottom - container.clientHeight;
    else nextTop = visibleTop;
  }

  container.scrollTo({
    top: Math.max(0, Math.min(nextTop, maxScroll)),
    behavior,
  });
  resetDocumentScroll();
}
