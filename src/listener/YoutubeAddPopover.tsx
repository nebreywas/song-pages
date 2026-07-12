import { useEffect, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';

type YoutubeAddResult = {
  duplicate: boolean;
  intakeNotice?: string | null;
  song?: import('../types/app').SongRow;
};

type YoutubeAddPopoverProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  busy: boolean;
  playlistId?: number;
  onClose: () => void;
  onAdded: (result: YoutubeAddResult) => void;
};

/** Paste a YouTube watch URL or video id — errors stay in the popover; success closes it. */
export function YoutubeAddPopover({
  open,
  anchor,
  busy,
  playlistId,
  onClose,
  onAdded,
}: YoutubeAddPopoverProps) {
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
    if (!app?.listener.addYoutubeSongToUserPlaylist) {
      setError('YouTube import is unavailable in this build.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await app.listener.addYoutubeSongToUserPlaylist(playlistId, trimmed);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not add that YouTube video.');
      return;
    }

    onAdded({
      duplicate: result.data.duplicate,
      intakeNotice: result.data.intakeNotice ?? null,
      song: result.data.song,
    });
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className="playlist-context-backdrop"
        aria-label="Dismiss add YouTube video"
        onClick={onClose}
      />
      <div
        className="youtube-add-popover panel suno-demo-add-popover"
        style={{ top: anchor.y, left: anchor.x }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="youtube-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="youtube-add-title" className="suno-demo-add-popover-title">
          Add YouTube Song
        </h2>
        <p className="suno-demo-add-popover-lead">Paste a youtube.com watch URL or the 11-character video ID.</p>
        <form className="suno-demo-add-popover-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="sr-only" htmlFor="youtube-add-url">
            YouTube URL or video ID
          </label>
          <input
            ref={inputRef}
            id="youtube-add-url"
            type="text"
            className="input suno-demo-add-popover-input"
            placeholder="https://www.youtube.com/watch?v=…"
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
