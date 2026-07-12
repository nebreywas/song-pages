import { useEffect, useRef, useState } from 'react';

import { MAX_USER_PLAYLIST_ABOUT_LENGTH } from '@shared/listener/userPlaylists';

export type PlaylistInfoPayload = {
  name: string;
  about: string;
};

type LibraryPlaylistInfoDialogProps = {
  open: boolean;
  playlistName: string;
  playlistAbout: string;
  busy?: boolean;
  onConfirm: (payload: PlaylistInfoPayload) => void;
  onCancel: () => void;
};

/** Edit playlist title and short About blurb for the home view. */
export function LibraryPlaylistInfoDialog({
  open,
  playlistName,
  playlistAbout,
  busy = false,
  onConfirm,
  onCancel,
}: LibraryPlaylistInfoDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(playlistName);
  const [about, setAbout] = useState(playlistAbout);

  useEffect(() => {
    if (!open) return;
    setName(playlistName);
    setAbout(playlistAbout);
    window.setTimeout(() => titleRef.current?.focus(), 0);
  }, [open, playlistAbout, playlistName]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  const trimmedName = name.trim();
  const trimmedAbout = about.trim();
  const initialName = playlistName.trim();
  const initialAbout = playlistAbout.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    (trimmedName !== initialName || trimmedAbout !== initialAbout);

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="subscribe-modal panel library-playlist-info-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-playlist-info-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="library-playlist-info-title">Playlist Info</h2>
        <form
          className="subscribe-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || busy) return;
            onConfirm({ name: trimmedName, about: trimmedAbout });
          }}
        >
          <label htmlFor="library-playlist-info-name">Title</label>
          <input
            ref={titleRef}
            id="library-playlist-info-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            autoComplete="off"
          />
          <label htmlFor="library-playlist-info-about">About</label>
          <textarea
            id="library-playlist-info-about"
            className="library-playlist-info-about"
            value={about}
            onChange={(event) => setAbout(event.target.value.slice(0, MAX_USER_PLAYLIST_ABOUT_LENGTH))}
            disabled={busy}
            rows={4}
            maxLength={MAX_USER_PLAYLIST_ABOUT_LENGTH}
            placeholder="Optional — a short note about this playlist"
          />
          <p className="library-playlist-info-about-count" aria-live="polite">
            {about.length}/{MAX_USER_PLAYLIST_ABOUT_LENGTH}
          </p>
          <div className="subscribe-modal-actions">
            <button type="submit" className="btn primary" disabled={!canSubmit || busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
