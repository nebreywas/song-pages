type VerticalResizeHandleProps = {
  onResizeDelta: (deltaY: number) => void;
};

/** Drag handle between the web content area and playlist to resize vertically. */
export function VerticalResizeHandle({ onResizeDelta }: VerticalResizeHandleProps) {
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    let lastY = event.clientY;

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      const delta = moveEvent.clientY - lastY;
      lastY = moveEvent.clientY;
      if (delta !== 0) onResizeDelta(delta);
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      handle.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      className="listener-resize-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize content and playlist"
      onPointerDown={onPointerDown}
    />
  );
}
