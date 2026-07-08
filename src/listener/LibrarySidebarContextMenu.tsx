type LibrarySidebarContextMenuProps = {
  playlistName: string;
  x: number;
  y: number;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
};

/** Right-click menu for Suno and custom sidebar playlists. */
export function LibrarySidebarContextMenu({
  playlistName,
  x,
  y,
  onRename,
  onRemove,
  onClose,
}: LibrarySidebarContextMenuProps) {
  return (
    <>
      <button type="button" className="playlist-context-backdrop" aria-label="Dismiss menu" onClick={onClose} />
      <div
        className="playlist-context-menu panel"
        style={{ top: y, left: x }}
        role="menu"
        onContextMenu={(event) => event.preventDefault()}
      >
        <button type="button" className="playlist-context-item" role="menuitem" onClick={onRename}>
          Rename playlist…
        </button>
        <button type="button" className="playlist-context-item" role="menuitem" onClick={onRemove}>
          Remove {playlistName}…
        </button>
      </div>
    </>
  );
}
