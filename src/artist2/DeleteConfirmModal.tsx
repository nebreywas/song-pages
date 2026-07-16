/**
 * Destructive delete confirmation — super-warns when references will be removed.
 */

import type { Artist2DeleteImpact } from '@shared/artist2';
import { artist2ContentTypeLabel } from '@shared/artist2';

type DeleteConfirmModalProps = {
  open: boolean;
  impact: Artist2DeleteImpact | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function kindLabel(impact: Artist2DeleteImpact): string {
  if (impact.object.kind === 'content') {
    return `${artist2ContentTypeLabel(impact.object.contentType).toLowerCase()} content`;
  }
  if (impact.object.kind === 'album') return 'album';
  if (impact.object.kind === 'playlist') return 'playlist';
  return 'song';
}

function parentKindLabel(kind: string): string {
  if (kind === 'playlist') return 'Playlist';
  if (kind === 'album') return 'Album';
  return 'Song';
}

function refSummary(ref: Artist2DeleteImpact['brokenRefs'][number]): string {
  if (ref.refKind === 'artworkRef') {
    return `${parentKindLabel(ref.parentKind)} “${ref.parentName}” — cover artwork`;
  }
  if (
    (ref.parentKind === 'album' || ref.parentKind === 'playlist') &&
    ref.field === 'tracks' &&
    ref.detail?.startsWith('Had track')
  ) {
    return ref.detail;
  }
  return `${parentKindLabel(ref.parentKind)} “${ref.parentName}” — ${ref.detail ?? 'track listing'}`;
}

export function DeleteConfirmModal({
  open,
  impact,
  loading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!open) return null;

  const hasImpact = (impact?.brokenRefs.length ?? 0) > 0;
  const typeLabel = impact ? kindLabel(impact) : 'item';

  return (
    <div className="a2-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className={`a2-modal a2-delete-modal${hasImpact ? ' a2-delete-modal--impact' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="a2-delete-title"
        aria-describedby="a2-delete-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="a2-modal-header">
          <h2 id="a2-delete-title">
            {loading && !impact
              ? 'Checking references…'
              : hasImpact
                ? 'Delete and remove references?'
                : `Delete ${typeLabel}?`}
          </h2>
          <button type="button" className="a2-modal-close" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </header>

        <div className="a2-modal-body" id="a2-delete-desc">
          {loading && !impact ? (
            <p className="a2-muted">Scanning catalog for references…</p>
          ) : impact ? (
            <>
              <p className="a2-delete-lead">
                Delete <strong>“{impact.object.name}”</strong>
                {impact.willSoftDelete
                  ? '? It will move to Deleted items and can be restored later (without its old links).'
                  : '? This content will be permanently removed.'}
              </p>

              {hasImpact ? (
                <div className="a2-delete-impact">
                  <p className="a2-delete-impact-intro">
                    This will detach <strong>{impact.brokenRefs.length}</strong>{' '}
                    {impact.brokenRefs.length === 1 ? 'reference' : 'references'}. A deletion report
                    will be saved so you can repair manually.
                  </p>
                  <ul className="a2-delete-impact-list">
                    {impact.brokenRefs.map((ref, index) => (
                      <li key={`${ref.parentId}-${ref.refKind}-${index}`}>{refSummary(ref)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <footer className="a2-modal-footer">
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="a2-danger"
            onClick={onConfirm}
            disabled={loading || !impact}
          >
            {loading
              ? impact
                ? 'Deleting…'
                : 'Checking…'
              : hasImpact
                ? 'Delete and remove references'
                : 'Delete'}
          </button>
        </footer>
      </div>
    </div>
  );
}
