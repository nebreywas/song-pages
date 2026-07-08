import type { SongRow } from '../types/app';
import type { PlaylistKind } from '@shared/listener/playlistKinds';
import { isSongSkipped } from '@shared/listener/playlistKinds';

type PlaylistRowContextMenuProps = {
  song: SongRow;
  playlistKind: PlaylistKind | null;
  x: number;
  y: number;
  onCopyLink: (song: SongRow) => void;
  onRemove: (song: SongRow) => void;
  onRestore: (song: SongRow) => void;
  onClose: () => void;
};

/** Right-click actions for a playlist row — remove behavior depends on playlist type. */
export function PlaylistRowContextMenu({
  song,
  playlistKind,
  x,
  y,
  onCopyLink,
  onRemove,
  onRestore,
  onClose,
}: PlaylistRowContextMenuProps) {
  const skipped = playlistKind === 'catalog' && isSongSkipped(song);
  const removeLabel =
    playlistKind === 'catalog'
      ? 'Remove song'
      : playlistKind === 'personal'
        ? 'Remove from Liked Songs'
        : playlistKind === 'suno'
          ? 'Remove from Suno Only'
          : 'Remove song';

  return (
    <>
      <button type="button" className="playlist-context-backdrop" aria-label="Dismiss menu" onClick={onClose} />
      <div
        className="playlist-context-menu panel"
        style={{ top: y, left: x }}
        role="menu"
        onContextMenu={(event) => event.preventDefault()}
      >
        {skipped ? (
          <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onRestore(song)}>
            Restore song
          </button>
        ) : playlistKind ? (
          <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onRemove(song)}>
            {removeLabel}
          </button>
        ) : null}
        <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onCopyLink(song)}>
          Copy song page link
        </button>
      </div>
    </>
  );
}
