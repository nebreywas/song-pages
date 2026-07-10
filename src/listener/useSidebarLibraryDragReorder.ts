import { useCallback, useEffect, useRef, useState } from 'react';

type DragSession = {
  fromIndex: number;
  pointerId: number;
};

function resolveInsertIndexFromY(
  clientY: number,
  rowElements: readonly (HTMLElement | null)[],
  rowCount: number,
): number {
  for (let index = 0; index < rowElements.length; index += 1) {
    const element = rowElements[index];
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return index;
    }
  }
  return Math.max(0, rowCount - 1);
}

type UseSidebarLibraryDragReorderOptions = {
  rowCount: number;
  enabled: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

/** Pointer-driven reordering for sidebar library rows (manual playlist order). */
export function useSidebarLibraryDragReorder({
  rowCount,
  enabled,
  onReorder,
}: UseSidebarLibraryDragReorderOptions) {
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const draggingIndex = dragSession?.fromIndex ?? -1;

  const clearDrag = useCallback(() => {
    setDragSession(null);
    setInsertIndex(null);
  }, []);

  const updateInsertIndex = useCallback(
    (clientY: number) => {
      if (!dragSession) return;
      setInsertIndex(resolveInsertIndexFromY(clientY, rowRefs.current, rowCount));
    },
    [dragSession, rowCount],
  );

  const finishDrag = useCallback(
    (clientY: number) => {
      if (!dragSession) return;
      const toIndex = resolveInsertIndexFromY(clientY, rowRefs.current, rowCount);
      if (dragSession.fromIndex !== toIndex) {
        onReorder(dragSession.fromIndex, toIndex);
      }
      clearDrag();
    },
    [clearDrag, dragSession, onReorder, rowCount],
  );

  useEffect(() => {
    if (!dragSession) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== dragSession.pointerId) return;
      updateInsertIndex(event.clientY);
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== dragSession.pointerId) return;
      finishDrag(event.clientY);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragSession, finishDrag, updateInsertIndex]);

  const setRowRef = useCallback((index: number, node: HTMLLIElement | null) => {
    rowRefs.current[index] = node;
  }, []);

  const startDrag = useCallback(
    (fromIndex: number, pointerId: number) => {
      if (!enabled) return;
      setDragSession({ fromIndex, pointerId });
      setInsertIndex(fromIndex);
    },
    [enabled],
  );

  const rowDragClassName = useCallback(
    (index: number) => {
      const classes: string[] = [];
      if (draggingIndex === index) classes.push('is-dragging');
      if (insertIndex === index && draggingIndex >= 0 && draggingIndex !== index) {
        classes.push('library-insert-before');
      }
      const showMarkerAfter =
        insertIndex === index + 1 && draggingIndex >= 0 && insertIndex !== draggingIndex;
      if (showMarkerAfter) classes.push('library-insert-after');
      return classes.join(' ');
    },
    [draggingIndex, insertIndex],
  );

  return {
    setRowRef,
    startDrag,
    rowDragClassName,
    isDragging: draggingIndex >= 0,
  };
}
