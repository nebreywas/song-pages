import { useEffect, useRef, useState } from 'react';

type LibraryPlaylistRenameDialogProps = {
  open: boolean;
  playlistName: string;
  busy?: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

/** Prompt to rename a Suno or custom sidebar playlist. */
export function LibraryPlaylistRenameDialog({
  open,
  playlistName,
  busy = false,
  onConfirm,
  onCancel,
}: LibraryPlaylistRenameDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(playlistName);

  useEffect(() => {
    if (!open) return;
    setName(playlistName);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, playlistName]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== playlistName.trim();

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="subscribe-modal panel library-playlist-rename-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-playlist-rename-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="library-playlist-rename-title">Rename playlist</h2>
        <form
          className="subscribe-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || busy) return;
            onConfirm(trimmed);
          }}
        >
          <label htmlFor="library-playlist-rename-input">Playlist name</label>
          <input
            ref={inputRef}
            id="library-playlist-rename-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            autoComplete="off"
          />
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
