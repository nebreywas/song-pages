import { useEffect } from 'react';

type OnDeckReplaceDialogProps = {
  open: boolean;
  existingSongTitle: string;
  existingPlaylistName: string;
  busy?: boolean;
  onReplace: () => void;
  onPlayNow: () => void;
  onCancel: () => void;
};

/** Shown when the user tries to On Deck a song while another is already queued. */
export function OnDeckReplaceDialog({
  open,
  existingSongTitle,
  existingPlaylistName,
  busy = false,
  onReplace,
  onPlayNow,
  onCancel,
}: OnDeckReplaceDialogProps) {
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
        className="subscribe-modal panel on-deck-replace-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="on-deck-replace-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="on-deck-replace-title">Replace On Deck song?</h2>
        <p className="on-deck-replace-copy">
          <strong>{existingSongTitle}</strong>
          <br />
          <span className="on-deck-replace-playlist">{existingPlaylistName}</span>
          <br />
          is currently On Deck.
        </p>
        <div className="subscribe-modal-actions on-deck-replace-actions">
          <button type="button" className="btn" onClick={onReplace} disabled={busy}>
            Replace
          </button>
          <button type="button" className="btn" onClick={onPlayNow} disabled={busy}>
            Play Now
          </button>
          <button type="button" className="btn subtle" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
