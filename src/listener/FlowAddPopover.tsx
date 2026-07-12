import { useEffect, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';

type FlowAddResult = {
  duplicate: boolean;
  song?: import('../types/app').SongRow;
};

type FlowAddPopoverProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  busy: boolean;
  playlistId?: number;
  onClose: () => void;
  onAdded: (result: FlowAddResult) => void;
};

/** Paste a Google Flow share URL or clip UUID — errors stay in the popover; success closes it. */
export function FlowAddPopover({
  open,
  anchor,
  busy,
  playlistId,
  onClose,
  onAdded,
}: FlowAddPopoverProps) {
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

  if (!open || !anchor || playlistId == null) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting || busy) return;

    const app = getApp();
    if (!app?.listener.addFlowSongToUserPlaylist) {
      setError('Google Flow import is unavailable in this build.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await app.listener.addFlowSongToUserPlaylist(playlistId, trimmed);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not add that Google Flow song.');
      return;
    }

    onAdded({
      duplicate: result.data.duplicate,
      song: result.data.song,
    });
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className="playlist-context-backdrop"
        aria-label="Dismiss add Google Flow song"
        onClick={onClose}
      />
      <div
        className="flow-add-popover panel suno-demo-add-popover"
        style={{ top: anchor.y, left: anchor.x }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="flow-add-title" className="suno-demo-add-popover-title">
          Add Google Flow Song
        </h2>
        <p className="suno-demo-add-popover-lead">
          Paste a public flowmusic.app song link. Private or signed clip URLs are not supported.
        </p>
        <form className="suno-demo-add-popover-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="sr-only" htmlFor="flow-add-url">
            Google Flow song URL or clip UUID
          </label>
          <input
            ref={inputRef}
            id="flow-add-url"
            type="text"
            className="input suno-demo-add-popover-input"
            placeholder="https://www.flowmusic.app/song/…"
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
