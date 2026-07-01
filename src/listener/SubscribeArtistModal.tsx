import { FormEvent, useEffect, useRef } from 'react';

type SubscribeArtistModalProps = {
  open: boolean;
  busy: boolean;
  siteUrl: string;
  onSiteUrlChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

/** Compact modal for adding a new artist subscription. */
export function SubscribeArtistModal({
  open,
  busy,
  siteUrl,
  onSiteUrlChange,
  onSubmit,
  onClose,
}: SubscribeArtistModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!siteUrl.trim() || busy) return;
    onSubmit();
  };

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={onClose}>
      <div
        className="subscribe-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="subscribe-title">Subscribe to artist</h2>
        <form onSubmit={handleSubmit} className="subscribe-modal-form">
          <input
            ref={inputRef}
            type="url"
            placeholder="https://artist.example.com"
            value={siteUrl}
            onChange={(e) => onSiteUrlChange(e.target.value)}
            disabled={busy}
            aria-label="Artist site URL"
          />
          <div className="subscribe-modal-actions">
            <button type="submit" className="btn primary" disabled={busy || !siteUrl.trim()}>
              Add
            </button>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
