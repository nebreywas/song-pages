import { useCallback, useEffect, useRef, useState } from 'react';

type DragSession = {
  songId: number;
  fromIndex: number;
  pointerId: number;
};

/** Map pointer Y to the row index where the dragged song should land. */
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

type UsePlaylistDragReorderOptions = {
  rowCount: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

/**
 * Pointer-driven row reordering for the listener playlist table.
 * Drag handle only — row click/double-click for preview/play stay intact.
 */
export function usePlaylistDragReorder({ rowCount, onReorder }: UsePlaylistDragReorderOptions) {
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const draggingSongId = dragSession?.songId ?? null;
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

  const setRowRef = useCallback((index: number, node: HTMLTableRowElement | null) => {
    rowRefs.current[index] = node;
  }, []);

  const startDrag = useCallback((songId: number, fromIndex: number, pointerId: number) => {
    setDragSession({ songId, fromIndex, pointerId });
    setInsertIndex(fromIndex);
  }, []);

  const rowDragClassName = useCallback(
    (songId: number, index: number) => {
      const classes: string[] = [];
      if (draggingSongId === songId) classes.push('is-dragging');
      if (insertIndex === index && draggingIndex >= 0 && draggingIndex !== index) {
        classes.push('playlist-insert-before');
      }
      const showMarkerAfter =
        insertIndex === index + 1 && draggingIndex >= 0 && insertIndex !== draggingIndex;
      if (showMarkerAfter) classes.push('playlist-insert-after');
      return classes.join(' ');
    },
    [draggingIndex, draggingSongId, insertIndex],
  );

  return {
    draggingSongId,
    setRowRef,
    startDrag,
    rowDragClassName,
    isDragging: draggingSongId != null,
  };
}
