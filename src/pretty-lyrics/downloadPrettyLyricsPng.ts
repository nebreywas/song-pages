/**
 * Snapshot the Lab lyrics canvas to a PNG download.
 * Uses html-to-image (SVG foreignObject → canvas) so theme bg / glow / fonts travel with the div.
 *
 * Important: the preview column is `overflow: auto`, so a naive capture only keeps the
 * on-screen viewport. We measure scrollWidth/Height and temporarily unclip overflow
 * ancestors so the full lyrics length is rendered into the PNG.
 */

import { toPng } from 'html-to-image';

type OverflowRestore = { el: HTMLElement; overflow: string };

/** Walk up and set overflow:visible on clipping ancestors; return values to restore. */
function unclipOverflowAncestors(node: HTMLElement): OverflowRestore[] {
  const restores: OverflowRestore[] = [];
  let el: HTMLElement | null = node.parentElement;
  while (el) {
    const style = getComputedStyle(el);
    const clips =
      style.overflow === 'auto' ||
      style.overflow === 'scroll' ||
      style.overflow === 'hidden' ||
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowY === 'hidden';
    if (clips) {
      restores.push({ el, overflow: el.style.overflow });
      el.style.overflow = 'visible';
    }
    // Stop at the lab shell — no need to poke the whole app.
    if (el.classList.contains('pretty-lab') || el === document.body) break;
    el = el.parentElement;
  }
  return restores;
}

export async function downloadPrettyLyricsPng(
  node: HTMLElement,
  filename: string,
  backgroundColor: string,
): Promise<void> {
  // Prefer the composed view itself (bg + padding); fall back to the capture wrapper.
  const target =
    (node.classList.contains('pretty-lyric-view')
      ? node
      : node.querySelector<HTMLElement>('.pretty-lyric-view')) ?? node;

  // Full content size — not the clipped client viewport of the scrollport.
  const width = Math.max(1, Math.ceil(target.scrollWidth));
  const height = Math.max(1, Math.ceil(target.scrollHeight));

  target.classList.add('is-png-export');
  node.classList.add('is-png-export');
  const restores = unclipOverflowAncestors(target);

  try {
    const dataUrl = await toPng(target, {
      cacheBust: true,
      pixelRatio: Math.min(2, window.devicePixelRatio || 2),
      backgroundColor,
      width,
      height,
      // Force the clone to the full content box so foreignObject isn't truncated.
      style: {
        width: `${width}px`,
        height: `${height}px`,
        maxHeight: 'none',
        overflow: 'visible',
        transform: 'none',
      },
      filter: (domNode) =>
        !(domNode instanceof HTMLElement && domNode.classList.contains('pretty-lab-ctx-menu')),
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    target.classList.remove('is-png-export');
    node.classList.remove('is-png-export');
    for (const { el, overflow } of restores) {
      el.style.overflow = overflow;
    }
  }
}
