import { useEffect, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';

type SunoDemoAddPopoverProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  busy: boolean;
  playlistId?: number;
  onClose: () => void;
  onAdded: () => void;
};

/** Paste a Suno share link or clip id — errors stay in the popover; success closes it. */
export function SunoDemoAddPopover({
  open,
  anchor,
  busy,
  playlistId,
  onClose,
  onAdded,
}: SunoDemoAddPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl('');
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !anchor) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting || busy) return;

    const app = getApp();
    if (!app?.listener.addSunoDemoSong) {
      setError('Suno track import is unavailable in this build.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await app.listener.addSunoDemoSong(trimmed, playlistId);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not import that Suno track.');
      return;
    }

    onAdded();
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className="playlist-context-backdrop"
        aria-label="Dismiss add Suno track"
        onClick={onClose}
      />
      <div
        className="suno-demo-add-popover panel"
        style={{ top: anchor.y, left: anchor.x }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suno-demo-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="suno-demo-add-title" className="suno-demo-add-popover-title">
          Add Suno Track
        </h2>
        <p className="suno-demo-add-popover-lead">Paste a suno.com share link or the track ID.</p>
        <form className="suno-demo-add-popover-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="sr-only" htmlFor="suno-demo-url">
            Suno URL or track ID
          </label>
          <input
            ref={inputRef}
            id="suno-demo-url"
            type="text"
            className="input suno-demo-add-popover-input"
            placeholder="https://suno.com/song/…"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError(null);
            }}
            disabled={submitting || busy}
            autoComplete="off"
            spellCheck={false}
          />
          {error ? <p className="error suno-demo-add-popover-error">{error}</p> : null}
          <div className="suno-demo-add-popover-actions">
            <button type="submit" className="btn primary" disabled={submitting || busy || !url.trim()}>
              {submitting ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
