import { useEffect, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';

type SunoDemoAddDialogProps = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onAdded: (songId: number) => void;
};

/** Secret demo dialog — paste a Suno share URL or clip UUID to import a track. */
export function SunoDemoAddDialog({ open, busy, onClose, onAdded }: SunoDemoAddDialogProps) {
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

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting || busy) return;

    const app = getApp();
    if (!app?.listener.addSunoDemoSong) {
      setError('Suno demo import is unavailable in this build.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await app.listener.addSunoDemoSong(trimmed);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not import that Suno track.');
      return;
    }

    onAdded(result.data.song.id);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal panel suno-demo-add-dialog"
        role="dialog"
        aria-labelledby="suno-demo-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="suno-demo-add-title">Add Suno track</h2>
        <p className="suno-demo-add-hint">
          Paste a <code>suno.com</code> share link or clip UUID. The track is stored locally for demo playback only.
        </p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className="sr-only" htmlFor="suno-demo-url">
            Suno URL or UUID
          </label>
          <input
            ref={inputRef}
            id="suno-demo-url"
            type="text"
            className="input"
            placeholder="https://suno.com/song/… or clip UUID"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={submitting || busy}
            autoComplete="off"
            spellCheck={false}
          />
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={submitting || busy || !url.trim()}>
              {submitting ? 'Importing…' : 'Add to Suno Only'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
