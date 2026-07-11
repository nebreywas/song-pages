import { useCallback, useEffect, useRef, useState } from 'react';

import { formatPlaylistDateAdded } from '@shared/listener/formatPlaylistDate';

import { SunoDemoAddPopover } from './SunoDemoAddPopover';

type SunoOnlyPanelProps = {
  playlistName: string;
  dateAdded: string;
  songCount: number;
  addTrackOpen: boolean;
  busy: boolean;
  playlistId?: number;
  onAddTrackOpenChange: (open: boolean) => void;
  onTrackAdded: () => void;
  onSharePlaylist: () => void;
};

/** Home view for a Suno-only demo playlist. */
export function SunoOnlyPanel({
  playlistName,
  dateAdded,
  songCount,
  addTrackOpen,
  busy,
  playlistId,
  onAddTrackOpenChange,
  onTrackAdded,
  onSharePlaylist,
}: SunoOnlyPanelProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  const resolveAnchor = useCallback(() => {
    const rect = addButtonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left, y: rect.bottom + 6 };
  }, []);

  const openPopover = useCallback(() => {
    const anchor = resolveAnchor();
    if (!anchor) return;
    setPopoverAnchor(anchor);
    onAddTrackOpenChange(true);
  }, [onAddTrackOpenChange, resolveAnchor]);

  const closePopover = useCallback(() => {
    onAddTrackOpenChange(false);
    setPopoverAnchor(null);
  }, [onAddTrackOpenChange]);

  useEffect(() => {
    if (!addTrackOpen) {
      setPopoverAnchor(null);
      return;
    }
    if (popoverAnchor) return;
    const anchor = resolveAnchor();
    if (anchor) setPopoverAnchor(anchor);
  }, [addTrackOpen, popoverAnchor, resolveAnchor]);

  const formattedDate = formatPlaylistDateAdded(dateAdded);
  const trackLabel = songCount === 1 ? '1 track' : `${songCount} tracks`;

  return (
    <div className="suno-only-panel">
      <h2 className="suno-only-panel-title">{playlistName}</h2>
      <p className="suno-only-panel-date">{formattedDate}</p>
      <p className="suno-only-panel-count">{trackLabel}</p>
      <div className="playlist-home-actions">
        <button type="button" className="btn" onClick={onSharePlaylist}>
          Share Playlist
        </button>
        <button ref={addButtonRef} type="button" className="btn primary" onClick={openPopover}>
          Add Suno Track
        </button>
      </div>
      <SunoDemoAddPopover
        open={addTrackOpen}
        anchor={popoverAnchor}
        busy={busy}
        playlistId={playlistId}
        onClose={closePopover}
        onAdded={onTrackAdded}
      />
    </div>
  );
}
