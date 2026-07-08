import { useCallback, useEffect, useRef, useState } from 'react';

import { kudoContentTypeLabel, type KudoPreset } from '@shared/kudos';

type KudosPresetListProps = {
  presets: KudoPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

type DragSession = {
  presetId: string;
  fromIndex: number;
  pointerId: number;
};

/** Map pointer Y to the list index where the dragged row should land. */
function resolveInsertIndexFromY(clientY: number, itemElements: readonly (HTMLElement | null)[], listLength: number): number {
  for (let index = 0; index < itemElements.length; index += 1) {
    const element = itemElements[index];
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return index;
    }
  }
  return Math.max(0, listLength - 1);
}

/** Ordered preset sidebar — drag handle reorders (§28.6 cycle order). */
export function KudosPresetList({
  presets,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
}: KudosPresetListProps) {
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const draggingIndex = dragSession?.fromIndex ?? -1;
  const draggingId = dragSession?.presetId ?? null;

  const clearDrag = useCallback(() => {
    setDragSession(null);
    setInsertIndex(null);
  }, []);

  const updateInsertIndex = useCallback(
    (clientY: number) => {
      if (!dragSession) return;
      setInsertIndex(resolveInsertIndexFromY(clientY, itemRefs.current, presets.length));
    },
    [dragSession, presets.length],
  );

  const finishDrag = useCallback(
    (clientY: number) => {
      if (!dragSession) return;
      const toIndex = resolveInsertIndexFromY(clientY, itemRefs.current, presets.length);
      if (dragSession.fromIndex !== toIndex) {
        onReorder(dragSession.fromIndex, toIndex);
      }
      clearDrag();
    },
    [clearDrag, dragSession, onReorder, presets.length],
  );

  // Track pointer outside the handle — HTML5 drag on nested buttons is unreliable in Electron.
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

  const handleDragHandlePointerDown = (
    event: React.PointerEvent<HTMLSpanElement>,
    presetId: string,
    index: number,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setDragSession({ presetId, fromIndex: index, pointerId: event.pointerId });
    setInsertIndex(index);
  };

  return (
    <aside className={`vc-kudos-list${draggingId ? ' is-dragging' : ''}`}>
      <div className="vc-kudos-list-header vc-kudos-list-columns" aria-hidden="true">
        <span className="vc-kudos-list-col-drag" />
        <span className="vc-kudos-list-col-name">Name</span>
        <span className="vc-kudos-list-col-type">Type</span>
        <span className="vc-kudos-list-col-delete" />
      </div>

      {presets.map((preset, index) => {
        const isSelected = selectedId === preset.id;
        const isDragging = draggingId === preset.id;
        const showMarkerBefore = insertIndex === index && draggingIndex >= 0 && draggingIndex !== index;
        const showMarkerAfter =
          insertIndex === index + 1 && draggingIndex >= 0 && insertIndex !== draggingIndex;

        return (
          <div
            key={preset.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className={`vc-kudos-list-item vc-kudos-list-columns${isSelected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
          >
            {showMarkerBefore ? <div className="vc-kudos-list-drop-marker is-before" aria-hidden="true" /> : null}

            <span
              role="button"
              tabIndex={0}
              className="vc-kudos-list-drag vc-kudos-list-col-drag"
              aria-label={`Drag to reorder ${preset.name}`}
              onPointerDown={(event) => handleDragHandlePointerDown(event, preset.id, index)}
            >
              ⋮⋮
            </span>

            <button type="button" className="vc-kudos-list-select vc-kudos-list-col-name" onClick={() => onSelect(preset.id)}>
              <span className="vc-kudos-list-name">{preset.name}</span>
            </button>

            <span className="vc-kudos-list-type vc-kudos-list-col-type">{kudoContentTypeLabel(preset.contentType)}</span>

            <button
              type="button"
              className="vc-kudos-list-delete vc-kudos-list-col-delete"
              aria-label={`Delete ${preset.name}`}
              onClick={() => onDelete(preset.id)}
            >
              ✕
            </button>

            {showMarkerAfter ? <div className="vc-kudos-list-drop-marker is-after" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </aside>
  );
}
