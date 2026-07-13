import type { SongRow } from '../types/app';
import type { PlaylistKind } from '@shared/listener/playlistKinds';
import { isSongSkippedForPlaylist } from '@shared/listener/playlistKinds';

type PlaylistRowContextMenuProps = {
  song: SongRow;
  playlistKind: PlaylistKind | null;
  playlistName?: string | null;
  x: number;
  y: number;
  playingSongId: number | null;
  onAddToPlaylist: (song: SongRow) => void;
  onCopyLink: (song: SongRow) => void;
  onPlayNow?: (song: SongRow) => void;
  onPutOnDeck?: (song: SongRow) => void;
  onSkip: (song: SongRow) => void;
  onRestore: (song: SongRow) => void;
  onRemove: (song: SongRow) => void;
  onClose: () => void;
  sessionSkippedIds: ReadonlySet<number>;
};

/** Right-click actions for a playlist row — skip vs remove depends on playlist type. */
export function PlaylistRowContextMenu({
  song,
  playlistKind,
  playlistName,
  x,
  y,
  playingSongId,
  onAddToPlaylist,
  onCopyLink,
  onPlayNow,
  onPutOnDeck,
  onSkip,
  onRestore,
  onRemove,
  onClose,
  sessionSkippedIds,
}: PlaylistRowContextMenuProps) {
  const skipped = isSongSkippedForPlaylist(song, sessionSkippedIds);
  const showDetourActions =
    playingSongId != null && playingSongId !== song.id && onPlayNow && onPutOnDeck;
  const removeLabel =
    playlistKind === 'personal'
      ? 'Remove from Liked Songs'
      : playlistKind === 'custom'
        ? `Remove from ${playlistName?.trim() || 'playlist'}`
        : null;

  return (
    <>
      <button type="button" className="playlist-context-backdrop" aria-label="Dismiss menu" onClick={onClose} />
      <div
        className="playlist-context-menu panel"
        style={{ top: y, left: x }}
        role="menu"
        onContextMenu={(event) => event.preventDefault()}
      >
        {showDetourActions ? (
          <>
            <button
              type="button"
              className="playlist-context-item"
              role="menuitem"
              onClick={() => onPlayNow(song)}
            >
              Play This Song Right Now
            </button>
            <button
              type="button"
              className="playlist-context-item"
              role="menuitem"
              onClick={() => onPutOnDeck(song)}
            >
              Put This Song On Deck
            </button>
          </>
        ) : null}
        <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onAddToPlaylist(song)}>
          Add to playlist…
        </button>
        {skipped ? (
          <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onRestore(song)}>
            Restore song
          </button>
        ) : playlistKind ? (
          <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onSkip(song)}>
            Skip song
          </button>
        ) : null}
        {removeLabel ? (
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
