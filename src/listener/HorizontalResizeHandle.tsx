type HorizontalResizeHandleProps = {
  onResizeDelta: (deltaX: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
};

/** Drag handle between the sidebar and main content to resize horizontally. */
export function HorizontalResizeHandle({
  onResizeDelta,
  onResizeStart,
  onResizeEnd,
}: HorizontalResizeHandleProps) {
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    onResizeStart?.();
    let lastX = event.clientX;

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      const delta = moveEvent.clientX - lastX;
      lastX = moveEvent.clientX;
      if (delta !== 0) onResizeDelta(delta);
    };

    const finish = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      handle.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      onResizeEnd?.();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };

  return (
    <div
      className="listener-sidebar-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize artists and playlists column"
      onPointerDown={onPointerDown}
    />
  );
}
