import type { SongRow } from '../types/app';

type PlaylistRowContextMenuProps = {
  song: SongRow;
  x: number;
  y: number;
  onCopyLink: (song: SongRow) => void;
  onClose: () => void;
};

/** Temporary right-click menu for copying a song's public page URL. */
export function PlaylistRowContextMenu({ song, x, y, onCopyLink, onClose }: PlaylistRowContextMenuProps) {
  return (
    <>
      <button type="button" className="playlist-context-backdrop" aria-label="Dismiss menu" onClick={onClose} />
      <div
        className="playlist-context-menu panel"
        style={{ top: y, left: x }}
        role="menu"
        onContextMenu={(event) => event.preventDefault()}
      >
        <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onCopyLink(song)}>
          Copy song page link
        </button>
      </div>
    </>
  );
}
