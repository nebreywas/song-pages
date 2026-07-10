import type { CSSProperties } from 'react';

let measureNode: HTMLSpanElement | null = null;

/**
 * Measure single-line marquee text width off-screen.
 * Kept outside the VC cell tree so it cannot paint a second visible line.
 */
export function measureMarqueeTextWidth(text: string, style: CSSProperties): number {
  if (typeof document === 'undefined' || !text) return 0;

  if (!measureNode) {
    measureNode = document.createElement('span');
    measureNode.setAttribute('aria-hidden', 'true');
    Object.assign(measureNode.style, {
      position: 'absolute',
      left: '-99999px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      width: 'max-content',
      maxWidth: 'none',
      overflow: 'visible',
    });
    document.body.appendChild(measureNode);
  }

  measureNode.style.fontFamily = String(style.fontFamily ?? 'sans-serif');
  measureNode.style.fontSize = String(style.fontSize ?? '16px');
  measureNode.style.fontWeight = String(style.fontWeight ?? 'normal');
  measureNode.style.fontStretch = String(style.fontStretch ?? 'normal');
  measureNode.textContent = text;

  return Math.ceil(Math.max(measureNode.scrollWidth, measureNode.getBoundingClientRect().width));
}
