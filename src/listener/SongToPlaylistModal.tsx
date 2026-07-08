import { useEffect, useMemo, useState } from 'react';
import type { PlaylistPickerRow } from '@shared/listener/userPlaylists';
import type { SongRow } from '../types/app';
import { isCustomPlaylist, isPersonalPlaylist } from '@shared/listener/playlistKinds';

type SongToPlaylistModalProps = {
  open: boolean;
  busy: boolean;
  song: SongRow | null;
  sourceArtistId: number | null;
  playlists: PlaylistPickerRow[];
  onAdd: (destPlaylistId: number) => void;
  onMove: (destPlaylistId: number) => void;
  onCancel: () => void;
};

/** Pick a custom playlist to add or move the current song into. */
export function SongToPlaylistModal({
  open,
  busy,
  song,
  sourceArtistId,
  playlists,
  onAdd,
  onMove,
  onCancel,
}: SongToPlaylistModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedId(playlists[0]?.id ?? null);
    setFilter('');
  }, [open, playlists]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, open]);

  const filteredPlaylists = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return playlists;
    return playlists.filter((playlist) => playlist.name.toLowerCase().includes(query));
  }, [filter, playlists]);

  const canMove = useMemo(() => {
    if (sourceArtistId == null) return false;
    if (isPersonalPlaylist(sourceArtistId)) return true;
    if (isCustomPlaylist(sourceArtistId)) return true;
    return false;
  }, [sourceArtistId]);

  if (!open || !song) return null;

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedId) ?? null;
  const isSameCustomPlaylist =
    sourceArtistId != null &&
    isCustomPlaylist(sourceArtistId) &&
    selectedPlaylist?.artist_id === sourceArtistId;

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="subscribe-modal panel song-to-playlist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-to-playlist-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="song-to-playlist-title">Add to playlist</h2>
        <p className="song-to-playlist-lead">
          <strong>{song.title}</strong>
          {song.artist_name ? ` · ${song.artist_name}` : ''}
        </p>
        <label className="song-to-playlist-filter-label" htmlFor="song-to-playlist-filter">
          Find playlist
        </label>
        <input
          id="song-to-playlist-filter"
          type="search"
          className="song-to-playlist-filter"
          placeholder="Search custom playlists…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          disabled={busy}
        />
        <ul className="song-to-playlist-list" role="listbox" aria-label="Custom playlists">
          {filteredPlaylists.length ? (
            filteredPlaylists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedId === playlist.id}
                  className={`song-to-playlist-option${selectedId === playlist.id ? ' active' : ''}`}
                  onClick={() => setSelectedId(playlist.id)}
                  disabled={busy}
                >
                  <span className="song-to-playlist-option-name">{playlist.name}</span>
                  <span className="song-to-playlist-option-count">{playlist.song_count}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="song-to-playlist-empty">No custom playlists match.</li>
          )}
        </ul>
        <div className="subscribe-modal-actions song-to-playlist-actions">
          {canMove ? (
            <button
              type="button"
              className="btn"
              disabled={busy || selectedId == null || isSameCustomPlaylist}
              onClick={() => selectedId != null && onMove(selectedId)}
            >
              Move
            </button>
          ) : null}
          <button
            type="button"
            className="btn primary"
            disabled={busy || selectedId == null || isSameCustomPlaylist}
            onClick={() => selectedId != null && onAdd(selectedId)}
          >
            Add
          </button>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
