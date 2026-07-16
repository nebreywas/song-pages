/**
 * Compile readiness — preview which songs will compile, warnings, and open output.
 * Lets artists inspect the compile bridge without treating Listener QA as blocking.
 */

import type { Artist2CompileBuildResult } from '@shared/artist2';

export type CompileResultSummary = {
  slug: string;
  previewUrl: string;
  outputFolder: string;
  songCount: number;
  buildVersion: string;
  generatedAt: string;
  warnings: string[];
  skippedSongs: Array<{ id: string; name: string; reason: string }>;
};

type CompileReadinessModalProps = {
  open: boolean;
  artistName: string;
  preview: Artist2CompileBuildResult | null;
  lastCompile: CompileResultSummary | null;
  loadingPreview: boolean;
  compiling: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onCompile: () => void;
  onOpenOutput: (folderPath: string) => void;
  onSelectSong?: (songId: string) => void;
};

export function CompileReadinessModal({
  open,
  artistName,
  preview,
  lastCompile,
  loadingPreview,
  compiling,
  onClose,
  onRefresh,
  onCompile,
  onOpenOutput,
  onSelectSong,
}: CompileReadinessModalProps) {
  if (!open) return null;

  const readyCount = preview?.manifest.songs.length ?? 0;
  const skipped = preview?.skippedSongs ?? [];
  const warnings = preview?.warnings ?? [];
  const canCompile = readyCount > 0 && !compiling;

  return (
    <div className="a2-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="a2-modal a2-compile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-compile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="a2-modal-header">
          <h2 id="a2-compile-title">Compile readiness</h2>
          <button type="button" className="a2-secondary" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="a2-help">
          Preview what Artist 2.0 will send to the static-site compiler for{' '}
          <strong>{artistName}</strong>. Soft-deleted songs and songs without a published recording
          are skipped.
        </p>

        <div className="a2-compile-actions">
          <button type="button" className="a2-secondary" disabled={loadingPreview} onClick={onRefresh}>
            {loadingPreview ? 'Refreshing…' : 'Refresh preview'}
          </button>
          <button type="button" disabled={!canCompile} onClick={onCompile}>
            {compiling ? 'Compiling…' : `Compile ${readyCount} song${readyCount === 1 ? '' : 's'}`}
          </button>
        </div>

        {loadingPreview && !preview ? (
          <p className="a2-muted">Loading preview…</p>
        ) : preview ? (
          <>
            <section className="a2-section">
              <h3>
                Ready ({readyCount})
                {preview.manifest.artistSlug ? (
                  <span className="a2-muted"> · slug {preview.manifest.artistSlug}</span>
                ) : null}
              </h3>
              {readyCount === 0 ? (
                <p className="a2-muted">No songs with a published audio file yet.</p>
              ) : (
                <ul className="a2-compile-list">
                  {preview.manifest.songs.map((song) => (
                    <li key={song.id}>
                      {onSelectSong ? (
                        <button
                          type="button"
                          className="a2-linkish"
                          onClick={() => onSelectSong(song.id)}
                        >
                          {song.title}
                        </button>
                      ) : (
                        <strong>{song.title}</strong>
                      )}
                      <span className="a2-muted">
                        {song.album ? ` · ${song.album}` : ' · no album'}
                        {song.hasCover ? '' : ' · no cover'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {skipped.length > 0 ? (
              <section className="a2-section">
                <h3>Skipped ({skipped.length})</h3>
                <ul className="a2-compile-list">
                  {skipped.map((row) => (
                    <li key={row.id}>
                      {onSelectSong ? (
                        <button
                          type="button"
                          className="a2-linkish"
                          onClick={() => onSelectSong(row.id)}
                        >
                          {row.name}
                        </button>
                      ) : (
                        <strong>{row.name}</strong>
                      )}
                      <span className="a2-muted"> — {row.reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {warnings.length > 0 ? (
              <section className="a2-section">
                <h3>Warnings</h3>
                <ul className="a2-compile-list a2-compile-warnings">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        {lastCompile ? (
          <section className="a2-section a2-compile-last">
            <h3>Last compile</h3>
            <p className="a2-muted">
              {lastCompile.songCount} song(s) · {lastCompile.slug} · {lastCompile.generatedAt}
            </p>
            <code className="a2-compile-path">{lastCompile.outputFolder}</code>
            <div className="a2-compile-actions">
              <button type="button" onClick={() => onOpenOutput(lastCompile.outputFolder)}>
                Open output folder
              </button>
              {lastCompile.previewUrl ? (
                <span className="a2-muted a2-compile-preview-url">
                  Preview path noted: {lastCompile.previewUrl}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
