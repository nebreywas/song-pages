import { useCallback, useEffect, useRef, useState } from 'react';

import { formatPlaylistCreatedDate } from '@shared/listener/formatPlaylistCreatedDate';

import { AddNewSongPopover, type ExternalSongAddResult } from './AddNewSongPopover';
import { IconCalendar, IconInfo, IconPlus, IconShare, IconTrash } from './PlayerIcons';
import { PlaylistSourceIcons } from './PlaylistSourceIcons';
import type { SongRow } from '../types/app';

type PlaylistPanelProps = {
  playlistName: string;
  playlistAbout: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  songCount: number;
  songs: SongRow[];
  playlistId?: number;
  addSongOpen: boolean;
  busy: boolean;
  onAddSongOpenChange: (open: boolean) => void;
  onSongAdded: (result: ExternalSongAddResult) => void;
  onSharePlaylist: () => void;
  onEditPlaylistInfo: () => void;
  onRemovePlaylist: () => void;
};

/** Home view for a user-created Playlist. */
export function CustomPlaylistPanel({
  playlistName,
  playlistAbout,
  createdAt,
  updatedAt,
  songCount,
  songs,
  playlistId,
  addSongOpen,
  busy,
  onAddSongOpenChange,
  onSongAdded,
  onSharePlaylist,
  onEditPlaylistInfo,
  onRemovePlaylist,
}: PlaylistPanelProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const aboutText = playlistAbout?.trim() ?? '';
  const createdLabel = formatPlaylistCreatedDate(createdAt);
  const updatedLabel = formatPlaylistCreatedDate(updatedAt ?? createdAt);
  const showDateFooter = Boolean(createdLabel || updatedLabel);

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
      <div className="custom-playlist-panel-body">
        <div className="custom-playlist-panel-heading">
          <h2 className="custom-playlist-panel-title">{playlistName}</h2>
          <p className="custom-playlist-panel-count">
            {songCount === 1 ? '1 track' : `${songCount} tracks`}
          </p>
        </div>
        {aboutText ? <p className="custom-playlist-panel-about">{aboutText}</p> : null}
        <PlaylistSourceIcons songs={songs} />
      </div>
      <div className="custom-playlist-panel-toolbar">
        <div className="playlist-home-actions">
          <div className="playlist-home-actions-group">
            <button type="button" className="btn" onClick={onEditPlaylistInfo} disabled={busy}>
              <IconInfo className="playlist-home-action-icon" />
              Playlist Info
            </button>
            <button type="button" className="btn" onClick={onSharePlaylist}>
              <IconShare className="playlist-home-action-icon" />
              Share Playlist
            </button>
            <button
              ref={addButtonRef}
              type="button"
              className="btn"
              onClick={openPopover}
            >
              <IconPlus className="playlist-home-action-icon" />
              Add Song
            </button>
          </div>
          <button
            type="button"
            className="btn playlist-home-remove-btn"
            onClick={onRemovePlaylist}
            disabled={busy}
            aria-label={`Remove ${playlistName}…`}
          >
            <IconTrash className="playlist-home-remove-icon" />
          </button>
        </div>
        {showDateFooter ? (
          <footer className="custom-playlist-panel-footer">
            <p className="custom-playlist-panel-created">
              <IconCalendar className="custom-playlist-panel-created-icon" />
              <span>
                {createdLabel ? <>Created on {createdLabel}</> : null}
                {createdLabel && updatedLabel ? ' · ' : null}
                {updatedLabel ? (
                  <em className="custom-playlist-panel-updated">last updated {updatedLabel}</em>
                ) : null}
              </span>
            </p>
          </footer>
        ) : null}
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
