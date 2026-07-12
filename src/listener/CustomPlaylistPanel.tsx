import { useCallback, useEffect, useRef, useState } from 'react';

import { YoutubeAddPopover } from './YoutubeAddPopover';

type CustomPlaylistPanelProps = {
  playlistName: string;
  songCount: number;
  playlistId?: number;
  addYoutubeOpen: boolean;
  busy: boolean;
  onAddYoutubeOpenChange: (open: boolean) => void;
  onYoutubeAdded: (result: {
    duplicate: boolean;
    intakeNotice?: string | null;
    song?: import('../types/app').SongRow;
  }) => void;
  onSharePlaylist: () => void;
};

/** Artist panel for a custom user playlist. */
export function CustomPlaylistPanel({
  playlistName,
  songCount,
  playlistId,
  addYoutubeOpen,
  busy,
  onAddYoutubeOpenChange,
  onYoutubeAdded,
  onSharePlaylist,
}: CustomPlaylistPanelProps) {
  const addLinkRef = useRef<HTMLButtonElement>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  const resolveAnchor = useCallback(() => {
    const rect = addLinkRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left, y: rect.bottom + 6 };
  }, []);

  const openPopover = useCallback(() => {
    const anchor = resolveAnchor();
    if (!anchor) return;
    setPopoverAnchor(anchor);
    onAddYoutubeOpenChange(true);
  }, [onAddYoutubeOpenChange, resolveAnchor]);

  const closePopover = useCallback(() => {
    onAddYoutubeOpenChange(false);
    setPopoverAnchor(null);
  }, [onAddYoutubeOpenChange]);

  useEffect(() => {
    if (!addYoutubeOpen) {
      setPopoverAnchor(null);
      return;
    }
    if (popoverAnchor) return;
    const anchor = resolveAnchor();
    if (anchor) setPopoverAnchor(anchor);
  }, [addYoutubeOpen, popoverAnchor, resolveAnchor]);

  return (
    <div className="custom-playlist-panel">
      <h2>{playlistName}</h2>
      <p className="custom-playlist-panel-copy">
        Your personal playlist — add tracks from any artist, Liked Songs, or Suno playlist via right-click.
      </p>
      <p className="custom-playlist-panel-count">
        {songCount === 1 ? '1 track' : `${songCount} tracks`}
      </p>
      <div className="playlist-home-actions">
        <button type="button" className="btn" onClick={onSharePlaylist}>
          Share Playlist
        </button>
        <button
          ref={addLinkRef}
          type="button"
          className="link-btn youtube-add-link"
          onClick={openPopover}
        >
          Add YouTube song
        </button>
      </div>
      <YoutubeAddPopover
        open={addYoutubeOpen}
        anchor={popoverAnchor}
        busy={busy}
        playlistId={playlistId}
        onClose={closePopover}
        onAdded={onYoutubeAdded}
      />
    </div>
  );
}
