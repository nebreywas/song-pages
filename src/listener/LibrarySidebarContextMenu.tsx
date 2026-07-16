import { useLayoutEffect, useRef, useState } from 'react';

import { clampFixedMenuPosition } from '../lib/clampFixedMenuPosition';

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    setCoords(clampFixedMenuPosition(el, { x, y }));
  }, [x, y]);

  return (
    <>
      <button type="button" className="playlist-context-backdrop" aria-label="Dismiss menu" onClick={onClose} />
      <div
        ref={menuRef}
        className="playlist-context-menu panel"
        style={{ top: coords.top, left: coords.left }}
        role="menu"
        onContextMenu={(event) => event.preventDefault()}
      >
        <button type="button" className="playlist-context-item" role="menuitem" onClick={onRename}>
          Playlist Info…
        </button>
        <button type="button" className="playlist-context-item" role="menuitem" onClick={onRemove}>
          Remove {playlistName}…
        </button>
      </div>
    </>
  );
}
