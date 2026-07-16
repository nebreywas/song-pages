/**
 * Drag a fixed floating panel by its header; persist left/top in localStorage.
 * Double-click the header (not on controls) to restore the CSS default corner.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export type FloatingPanelPos = { left: number; top: number };

type DragSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originLeft: number;
  originTop: number;
};

function readStoredPos(storageKey: string): FloatingPanelPos | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloatingPanelPos>;
    if (
      typeof parsed.left !== 'number' ||
      typeof parsed.top !== 'number' ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top)
    ) {
      return null;
    }
    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function writeStoredPos(storageKey: string, pos: FloatingPanelPos | null): void {
  if (typeof localStorage === 'undefined') return;
  if (!pos) {
    localStorage.removeItem(storageKey);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(pos));
}

/** Keep the panel fully visible with a small margin when the window resizes. */
function clampToViewport(
  left: number,
  top: number,
  width: number,
  height: number,
  margin = 8,
): FloatingPanelPos {
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label';

export function useFloatingPanelDrag(storageKey: string) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const posRef = useRef<FloatingPanelPos | null>(readStoredPos(storageKey));
  const [pos, setPos] = useState<FloatingPanelPos | null>(() => posRef.current);
  const [dragging, setDragging] = useState(false);

  const commitPos = useCallback(
    (next: FloatingPanelPos | null) => {
      posRef.current = next;
      setPos(next);
      writeStoredPos(storageKey, next);
    },
    [storageKey],
  );

  const applyClamp = useCallback((next: FloatingPanelPos) => {
    const el = panelRef.current;
    if (!el) return next;
    const rect = el.getBoundingClientRect();
    return clampToViewport(next.left, next.top, rect.width, rect.height);
  }, []);

  // Keep a saved position inside the viewport when the window resizes.
  useEffect(() => {
    const reclamp = () => {
      if (dragRef.current) return;
      const current = posRef.current;
      if (!current) return;
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const clamped = clampToViewport(current.left, current.top, rect.width, rect.height);
      if (clamped.left !== current.left || clamped.top !== current.top) {
        commitPos(clamped);
      }
    };

    window.addEventListener('resize', reclamp);
    // One paint so getBoundingClientRect matches layout after restore.
    const raf = requestAnimationFrame(reclamp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reclamp);
    };
  }, [commitPos]);

  const resetPosition = useCallback(() => {
    commitPos(null);
  }, [commitPos]);

  const onHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return;

      const el = panelRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      // First drag from a CSS corner (right/bottom) promotes to left/top coords.
      const originLeft = posRef.current?.left ?? rect.left;
      const originTop = posRef.current?.top ?? rect.top;

      dragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originLeft,
        originTop,
      };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [],
  );

  const onHeaderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const next = applyClamp({
        left: session.originLeft + (event.clientX - session.startClientX),
        top: session.originTop + (event.clientY - session.startClientY),
      });
      posRef.current = next;
      setPos(next);
    },
    [applyClamp],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const current = posRef.current;
      if (!current) return;
      commitPos(applyClamp(current));
    },
    [applyClamp, commitPos],
  );

  const onHeaderDoubleClick = useCallback(
    (event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return;
      resetPosition();
    },
    [resetPosition],
  );

  const style: CSSProperties | undefined = pos
    ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' }
    : undefined;

  return {
    panelRef,
    style,
    dragging,
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp: endDrag,
    onHeaderPointerCancel: endDrag,
    onHeaderDoubleClick,
    resetPosition,
  };
}
