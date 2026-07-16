import { useLayoutEffect, useRef, useState } from 'react';

import { clampFixedMenuPosition } from '../lib/clampFixedMenuPosition';
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
  /** When set, show Add/Remove Liked Songs (hidden on the Liked Songs playlist itself). */
  liked?: boolean;
  onToggleLiked?: (song: SongRow) => void;
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
  liked = false,
  onToggleLiked,
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: x, top: y });

  const skipped = isSongSkippedForPlaylist(song, sessionSkippedIds);
  const showDetourActions =
    playingSongId != null &&
    playingSongId !== song.id &&
    typeof onPlayNow === 'function' &&
    typeof onPutOnDeck === 'function';
  // On Liked Songs every row is liked — same action reads "Remove from Liked Songs".
  const showLikedToggle = typeof onToggleLiked === 'function';
  const likedLabel = liked || playlistKind === 'personal' ? 'Remove from Liked Songs' : 'Add to Liked Songs';
  // Custom playlists keep a separate "Remove from {playlist}" — Liked Songs uses the liked toggle.
  const removeLabel =
    playlistKind === 'custom' ? `Remove from ${playlistName?.trim() || 'playlist'}` : null;

  // Measure after paint so bottom-of-list clicks open the menu above the row.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    setCoords(clampFixedMenuPosition(el, { x, y }));
  }, [x, y, skipped, showDetourActions, showLikedToggle, likedLabel, removeLabel]);

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
        {showDetourActions ? (
          <>
            <button
              type="button"
              className="playlist-context-item"
              role="menuitem"
              onClick={() => onPlayNow?.(song)}
            >
              Play This Song Right Now
            </button>
            <button
              type="button"
              className="playlist-context-item"
              role="menuitem"
              onClick={() => onPutOnDeck?.(song)}
            >
              Put This Song On Deck
            </button>
          </>
        ) : null}
        <button type="button" className="playlist-context-item" role="menuitem" onClick={() => onAddToPlaylist(song)}>
          Add to playlist…
        </button>
        {showLikedToggle ? (
          <button
            type="button"
            className="playlist-context-item"
            role="menuitem"
            onClick={() => onToggleLiked?.(song)}
          >
            {likedLabel}
          </button>
        ) : null}
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
