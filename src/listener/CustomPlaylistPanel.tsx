import { useCallback, useEffect, useRef, useState } from 'react';

import { AddNewSongPopover, type ExternalSongAddResult } from './AddNewSongPopover';

type PlaylistPanelProps = {
  playlistName: string;
  songCount: number;
  playlistId?: number;
  addSongOpen: boolean;
  busy: boolean;
  onAddSongOpenChange: (open: boolean) => void;
  onSongAdded: (result: ExternalSongAddResult) => void;
  onSharePlaylist: () => void;
};

/** Home view for a user-created Playlist. */
export function CustomPlaylistPanel({
  playlistName,
  songCount,
  playlistId,
  addSongOpen,
  busy,
  onAddSongOpenChange,
  onSongAdded,
  onSharePlaylist,
}: PlaylistPanelProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const resolveAnchor = useCallback((button: HTMLButtonElement | null) => {
    const rect = button?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left, y: rect.bottom + 6 };
  }, []);

  const openPopover = useCallback(() => {
    const next = resolveAnchor(addButtonRef.current);
    if (!next) return;
    setAnchor(next);
    onAddSongOpenChange(true);
  }, [onAddSongOpenChange, resolveAnchor]);

  const closePopover = useCallback(() => {
    onAddSongOpenChange(false);
    setAnchor(null);
  }, [onAddSongOpenChange]);

  useEffect(() => {
    if (!addSongOpen) {
      setAnchor(null);
      return;
    }
    if (anchor) return;
    const next = resolveAnchor(addButtonRef.current);
    if (next) setAnchor(next);
  }, [addSongOpen, anchor, resolveAnchor]);

  return (
    <div className="custom-playlist-panel">
      <h2>{playlistName}</h2>
      <p className="custom-playlist-panel-copy">
        Your playlist — add tracks from Artist Pages, Liked Songs, or other playlists via
        right-click, or paste a supported third-party link below.
      </p>
      <p className="custom-playlist-panel-count">
        {songCount === 1 ? '1 track' : `${songCount} tracks`}
      </p>
      <div className="playlist-home-actions">
        <button type="button" className="btn" onClick={onSharePlaylist}>
          Share Playlist
        </button>
        <button
          ref={addButtonRef}
          type="button"
          className="btn primary"
          onClick={openPopover}
        >
          Add New Song
        </button>
      </div>
      <AddNewSongPopover
        open={addSongOpen}
        anchor={anchor}
        busy={busy}
        playlistId={playlistId}
        onClose={closePopover}
        onAdded={onSongAdded}
      />
    </div>
  );
}
