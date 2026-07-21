/**
 * Resolved Content reference for Song/Album artwork fields.
 */

import type { Artist2CatalogObject, Artist2ContentPayload } from '@shared/artist2';

import { ArtworkFileMeta } from './ArtworkFileMeta';

function basename(path: string | null | undefined): string {
  if (!path) return 'No file';
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

type ArtworkRefViewProps = {
  content: Artist2CatalogObject | null;
  onClear: () => void;
  /** Pick a new local image and switch artwork back to inline. */
  onChooseInline?: () => void;
  onOpenContent?: () => void;
  onRenameCover?: () => Promise<void>;
  renameBusy?: boolean;
};

export function ArtworkRefView({
  content,
  onClear,
  onChooseInline,
  onOpenContent,
  onRenameCover,
  renameBusy = false,
}: ArtworkRefViewProps) {
  if (!content || content.kind !== 'content' || content.contentType !== 'image') {
    return (
      <div className="a2-artwork-ref a2-artwork-ref--missing">
        <p className="a2-ref-note a2-ref-missing">
          Referenced Content is missing from this catalog.
        </p>
        <div className="a2-artwork-ref-actions">
          {onChooseInline ? (
            <button type="button" onClick={onChooseInline}>
              Choose image…
            </button>
          ) : null}
          <button type="button" className="a2-secondary" onClick={onClear}>
            Clear reference
          </button>
        </div>
      </div>
    );
  }

  const payload = content.payload as Artist2ContentPayload;
  const filePath = payload.filePath ?? null;

  return (
    <div className="a2-artwork-ref">
      <div className="a2-artwork-ref-main">
        <strong>{content.name}</strong>
        <span className="a2-artwork-ref-file">{basename(filePath)}</span>
        <ArtworkFileMeta filePath={filePath} />
      </div>
      <div className="a2-artwork-ref-actions">
        {onOpenContent ? (
          <button type="button" className="a2-secondary" onClick={onOpenContent}>
            Open Content
          </button>
        ) : null}
        {onRenameCover && filePath ? (
          <button
            type="button"
            className="a2-secondary"
            disabled={renameBusy}
            title="Rename Tool: rewrite the filename using this object’s name ({name}-COVER.{ext})"
            onClick={() => {
              void onRenameCover();
            }}
          >
            {renameBusy ? 'Renaming…' : 'Rename Tool'}
          </button>
        ) : null}
        {onChooseInline ? (
          <button type="button" className="a2-secondary" onClick={onChooseInline}>
            Replace with file…
          </button>
        ) : null}
        <button type="button" onClick={onClear}>
          Clear reference
        </button>
      </div>
    </div>
  );
}
