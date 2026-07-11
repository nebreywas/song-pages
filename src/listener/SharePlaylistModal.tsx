import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_PLAYLIST_EXPORT_INTRODUCTION,
  normalizePlaylistExportLinkStyle,
  renderPlaylistExport,
  type PlaylistExportLinkStyle,
  type PlaylistExportOutputFormat,
  type PlaylistExportSongInput,
} from '@shared/listener/playlistExport';

type SharePlaylistModalProps = {
  open: boolean;
  busy: boolean;
  playlistName: string;
  createdAt: string | null;
  songs: PlaylistExportSongInput[];
  customOrderIds: number[] | null;
  onClose: () => void;
  onCopyError: (message: string) => void;
};

const DEFAULT_OPTIONS = {
  includeAlbum: true,
  includeYear: true,
  includeLength: true,
  linkStyle: 'fullUrls' as PlaylistExportLinkStyle,
  outputFormat: 'plainText' as PlaylistExportOutputFormat,
};

/** Generate formatted playlist text for sharing — options left, live preview right. */
export function SharePlaylistModal({
  open,
  busy,
  playlistName,
  createdAt,
  songs,
  customOrderIds,
  onClose,
  onCopyError,
}: SharePlaylistModalProps) {
  const [name, setName] = useState(playlistName);
  const [introduction, setIntroduction] = useState(DEFAULT_PLAYLIST_EXPORT_INTRODUCTION);
  const [includeAlbum, setIncludeAlbum] = useState(DEFAULT_OPTIONS.includeAlbum);
  const [includeYear, setIncludeYear] = useState(DEFAULT_OPTIONS.includeYear);
  const [includeLength, setIncludeLength] = useState(DEFAULT_OPTIONS.includeLength);
  const [linkStyle, setLinkStyle] = useState<PlaylistExportLinkStyle>(DEFAULT_OPTIONS.linkStyle);
  const [outputFormat, setOutputFormat] = useState<PlaylistExportOutputFormat>(DEFAULT_OPTIONS.outputFormat);
  const [copyBusy, setCopyBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(playlistName);
    setIntroduction(DEFAULT_PLAYLIST_EXPORT_INTRODUCTION);
    setIncludeAlbum(DEFAULT_OPTIONS.includeAlbum);
    setIncludeYear(DEFAULT_OPTIONS.includeYear);
    setIncludeLength(DEFAULT_OPTIONS.includeLength);
    setLinkStyle(DEFAULT_OPTIONS.linkStyle);
    setOutputFormat(DEFAULT_OPTIONS.outputFormat);
  }, [open, playlistName]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !copyBusy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, copyBusy, onClose, open]);

  const effectiveLinkStyle = normalizePlaylistExportLinkStyle(outputFormat, linkStyle);
  const maskedLinksDisabled = outputFormat === 'plainText';

  const preview = useMemo(
    () =>
      renderPlaylistExport({
        playlistName: name,
        introduction,
        createdAt,
        songs,
        customOrderIds,
        options: {
          playlistName: name,
          introduction,
          includeAlbum,
          includeYear,
          includeLength,
          linkStyle: effectiveLinkStyle,
          outputFormat,
        },
      }),
    [
      createdAt,
      customOrderIds,
      effectiveLinkStyle,
      includeAlbum,
      includeLength,
      includeYear,
      introduction,
      name,
      outputFormat,
      songs,
    ],
  );

  const handleCopy = async () => {
    setCopyBusy(true);
    try {
      await navigator.clipboard.writeText(preview);
      onClose();
    } catch {
      onCopyError('Could not copy playlist to clipboard.');
    } finally {
      setCopyBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="subscribe-backdrop" role="presentation" onClick={busy || copyBusy ? undefined : onClose}>
      <div
        className="subscribe-modal panel share-playlist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-playlist-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="share-playlist-title">Share Playlist</h2>

        <div className="share-playlist-layout">
          <div className="share-playlist-options">
            <label className="share-playlist-field">
              <span className="share-playlist-label">Playlist name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy || copyBusy}
              />
            </label>

            <label className="share-playlist-field">
              <span className="share-playlist-label">Message</span>
              <textarea
                className="share-playlist-intro"
                value={introduction}
                onChange={(event) => setIntroduction(event.target.value)}
                rows={4}
                disabled={busy || copyBusy}
              />
            </label>

            <fieldset className="share-playlist-fieldset">
              <legend>Include</legend>
              <label className="share-playlist-check">
                <input
                  type="checkbox"
                  checked={includeAlbum}
                  onChange={(event) => setIncludeAlbum(event.target.checked)}
                  disabled={busy || copyBusy}
                />
                Album name
              </label>
              <label className="share-playlist-check">
                <input
                  type="checkbox"
                  checked={includeYear}
                  onChange={(event) => setIncludeYear(event.target.checked)}
                  disabled={busy || copyBusy}
                />
                Song year
              </label>
              <label className="share-playlist-check">
                <input
                  type="checkbox"
                  checked={includeLength}
                  onChange={(event) => setIncludeLength(event.target.checked)}
                  disabled={busy || copyBusy}
                />
                Song length
              </label>
            </fieldset>

            <fieldset className="share-playlist-fieldset">
              <legend>Link style</legend>
              <label className="share-playlist-radio">
                <input
                  type="radio"
                  name="share-link-style"
                  checked={effectiveLinkStyle === 'fullUrls'}
                  onChange={() => setLinkStyle('fullUrls')}
                  disabled={busy || copyBusy}
                />
                Full URLs
              </label>
              <label className={`share-playlist-radio${maskedLinksDisabled ? ' disabled' : ''}`}>
                <input
                  type="radio"
                  name="share-link-style"
                  checked={effectiveLinkStyle === 'maskedLinks'}
                  onChange={() => setLinkStyle('maskedLinks')}
                  disabled={busy || copyBusy || maskedLinksDisabled}
                />
                Masked links (Discord markdown only)
              </label>
              <label className="share-playlist-radio">
                <input
                  type="radio"
                  name="share-link-style"
                  checked={effectiveLinkStyle === 'noLinks'}
                  onChange={() => setLinkStyle('noLinks')}
                  disabled={busy || copyBusy}
                />
                No links
              </label>
            </fieldset>

            <fieldset className="share-playlist-fieldset">
              <legend>Output format</legend>
              <label className="share-playlist-radio">
                <input
                  type="radio"
                  name="share-output-format"
                  checked={outputFormat === 'plainText'}
                  onChange={() => setOutputFormat('plainText')}
                  disabled={busy || copyBusy}
                />
                Plain text
              </label>
              <label className="share-playlist-radio">
                <input
                  type="radio"
                  name="share-output-format"
                  checked={outputFormat === 'markdown'}
                  onChange={() => setOutputFormat('markdown')}
                  disabled={busy || copyBusy}
                />
                Markdown
              </label>
            </fieldset>
          </div>

          <div className="share-playlist-preview-wrap">
            <span className="share-playlist-label">Live preview</span>
            <pre className="share-playlist-preview" aria-readonly="true">
              {preview}
            </pre>
          </div>
        </div>

        <div className="subscribe-modal-actions share-playlist-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy || copyBusy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => void handleCopy()}
            disabled={busy || copyBusy}
          >
            {copyBusy ? 'Copying…' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
