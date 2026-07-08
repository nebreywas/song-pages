import { useEffect } from 'react';

type LibraryPlaylistRemoveConfirmProps = {
  open: boolean;
  playlistName: string;
  songCount: number;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirm before deleting a Suno sidebar playlist and all of its tracks. */
export function LibraryPlaylistRemoveConfirm({
  open,
  playlistName,
  songCount,
  busy = false,
  onConfirm,
  onCancel,
}: LibraryPlaylistRemoveConfirmProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  const trackLabel = songCount === 1 ? '1 track' : `${songCount} tracks`;

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="subscribe-modal panel library-playlist-remove-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-playlist-remove-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="library-playlist-remove-title">Remove playlist?</h2>
        <p className="library-playlist-remove-copy">
          Delete <strong>{playlistName}</strong> and its {trackLabel}? This cannot be undone.
        </p>
        <div className="subscribe-modal-actions">
          <button type="button" className="btn danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Removing…' : 'Remove playlist'}
          </button>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
