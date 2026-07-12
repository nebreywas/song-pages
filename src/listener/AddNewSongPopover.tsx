import { useEffect, useRef, useState } from 'react';
import {
  EXTERNAL_SONG_INTAKE_PLACEHOLDER,
  SUPPORTED_EXTERNAL_SONG_SERVICES,
  detectExternalSongProvider,
} from '@shared/listener/externalSongIntake';
import { getApp } from '../lib/bridge';

export type ExternalSongAddResult = {
  duplicate: boolean;
  intakeNotice?: string | null;
  song?: import('../types/app').SongRow;
  provider?: string;
};

type AddNewSongPopoverProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  busy: boolean;
  playlistId?: number;
  onClose: () => void;
  onAdded: (result: ExternalSongAddResult) => void;
};

/**
 * Unified third-party intake — one URL field, provider auto-detected at submit.
 * Main process re-validates and returns specific errors for malformed or unreachable links.
 */
export function AddNewSongPopover({
  open,
  anchor,
  busy,
  playlistId,
  onClose,
  onAdded,
}: AddNewSongPopoverProps) {
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

    const detection = detectExternalSongProvider(trimmed);
    if (!detection.ok) {
      setError(detection.error);
      return;
    }

    const app = getApp();
    if (!app?.listener.addExternalSongToUserPlaylist) {
      setError('Song import is unavailable in this build. Restart the app.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await app.listener.addExternalSongToUserPlaylist(playlistId, trimmed);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not add that song.');
      return;
    }

    onAdded({
      duplicate: result.data.duplicate,
      intakeNotice: result.data.intakeNotice ?? null,
      song: result.data.song,
      provider: result.data.provider,
    });
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className="playlist-context-backdrop"
        aria-label="Dismiss add song"
        onClick={onClose}
      />
      <div
        className="add-new-song-popover panel suno-demo-add-popover"
        style={{ top: anchor.y, left: anchor.x }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-new-song-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="add-new-song-title" className="suno-demo-add-popover-title">
          Add New Song
        </h2>
        <p className="suno-demo-add-popover-lead">
          Paste a link or ID from {SUPPORTED_EXTERNAL_SONG_SERVICES}. Other services and local files
          are not supported.
        </p>
        <form className="suno-demo-add-popover-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="sr-only" htmlFor="add-new-song-url">
            Song link or ID
          </label>
          <input
            ref={inputRef}
            id="add-new-song-url"
            type="text"
            className="input suno-demo-add-popover-input"
            placeholder={EXTERNAL_SONG_INTAKE_PLACEHOLDER}
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
