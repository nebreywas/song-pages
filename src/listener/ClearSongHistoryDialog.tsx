import { useEffect } from 'react';

type ClearSongHistoryDialogProps = {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirms permanent removal of all song playback history. */
export function ClearSongHistoryDialog({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: ClearSongHistoryDialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="subscribe-modal panel song-history-clear-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-history-clear-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="song-history-clear-title">Clear Song History?</h2>
        <p className="song-history-clear-copy">
          This will permanently remove all playback history.
        </p>
        <div className="subscribe-modal-actions song-history-clear-actions">
          <button type="button" className="btn" onClick={onConfirm} disabled={busy}>
            Clear
          </button>
          <button type="button" className="btn subtle" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
