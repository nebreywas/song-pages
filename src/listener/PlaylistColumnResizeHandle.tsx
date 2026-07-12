type PlaylistColumnResizeHandleProps = {
  label: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

/** Drag handle on the right edge of a resizable playlist column header. */
export function PlaylistColumnResizeHandle({ label, onPointerDown }: PlaylistColumnResizeHandleProps) {
  return (
    <div
      className="playlist-col-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPointerDown(event);
      }}
    >
      <span className="playlist-col-resize-grip" aria-hidden="true" />
    </div>
  );
}
