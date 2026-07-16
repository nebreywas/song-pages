/**
 * Deleted items modal — restore soft-deleted songs/containers and review deletion reports.
 * Active catalog sidebar stays separate; this is the repair workspace.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  Artist2BrokenReference,
  Artist2CatalogObject,
  Artist2DeletionReport,
} from '@shared/artist2';
import { artist2ContentTypeLabel } from '@shared/artist2';

import { formatCatalogAddedDate } from './catalogSidebarUtils';

type DeletedItemsTab = 'restore' | 'reports';

type DeletedItemsModalProps = {
  open: boolean;
  artistName: string;
  deletedObjects: Artist2CatalogObject[];
  deletionReports: Artist2DeletionReport[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onClearReport: (reportId: string) => Promise<void>;
  onClearAllReports: () => Promise<void>;
  /** Selective repair — re-add restored Song into a container from a report ref. */
  onRepairRef?: (reportId: string, refIndex: number) => Promise<void>;
};

function objectKindLabel(obj: Artist2CatalogObject): string {
  if (obj.kind === 'album') return 'Album';
  if (obj.kind === 'playlist') return 'Playlist';
  return 'Song';
}

function reportKindLabel(report: Artist2DeletionReport): string {
  if (report.deletedKind === 'content') {
    return `${artist2ContentTypeLabel(report.deletedContentType)} content`;
  }
  if (report.deletedKind === 'album') return 'Album';
  if (report.deletedKind === 'playlist') return 'Playlist';
  return 'Song';
}

function refLine(ref: Artist2BrokenReference): string {
  const parent =
    ref.parentKind === 'playlist' ? 'Playlist' : ref.parentKind === 'album' ? 'Album' : 'Song';
  if (ref.refKind === 'artworkRef') {
    return `${parent} “${ref.parentName}” lost cover artwork`;
  }
  if (ref.detail?.startsWith('Had track')) {
    return ref.detail.replace('Had track', `${parent} had track`);
  }
  return `Removed from ${parent.toLowerCase()} “${ref.parentName}” (${ref.detail ?? 'track listing'})`;
}

export function DeletedItemsModal({
  open,
  artistName,
  deletedObjects,
  deletionReports,
  loading,
  onClose,
  onRefresh,
  onRestore,
  onClearReport,
  onClearAllReports,
  onRepairRef,
}: DeletedItemsModalProps) {
  const [tab, setTab] = useState<DeletedItemsTab>('restore');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!open) return;
    // Refresh once per open — stable ref avoids infinite reload when parent re-renders.
    void onRefreshRef.current();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleRestore = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await onRestore(id);
      } finally {
        setBusyId(null);
      }
    },
    [onRestore],
  );

  const handleClearReport = useCallback(
    async (reportId: string) => {
      setBusyId(reportId);
      try {
        await onClearReport(reportId);
        if (expandedReportId === reportId) setExpandedReportId(null);
      } finally {
        setBusyId(null);
      }
    },
    [expandedReportId, onClearReport],
  );

  if (!open) return null;

  // Keep showing cached rows while revalidating — only block the body on first load.
  const showBlockingLoad =
    loading && deletedObjects.length === 0 && deletionReports.length === 0;

  return (
    <div className="a2-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="a2-modal a2-deleted-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-deleted-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="a2-modal-header">
          <div>
            <h2 id="a2-deleted-title">Deleted items</h2>
            <p className="a2-modal-subtitle">{artistName}</p>
          </div>
          <button type="button" className="a2-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <nav className="a2-modal-tabs" aria-label="Deleted items sections">
          <button
            type="button"
            className={`a2-modal-tab${tab === 'restore' ? ' is-active' : ''}`}
            onClick={() => setTab('restore')}
          >
            Restore ({deletedObjects.length})
          </button>
          <button
            type="button"
            className={`a2-modal-tab${tab === 'reports' ? ' is-active' : ''}`}
            onClick={() => setTab('reports')}
          >
            Deletion reports ({deletionReports.length})
          </button>
        </nav>

        <div className="a2-modal-body a2-deleted-body">
          {showBlockingLoad ? <p className="a2-muted">Loading…</p> : null}
          {!showBlockingLoad && loading ? (
            <p className="a2-muted a2-deleted-refresh-hint">Refreshing…</p>
          ) : null}

          {!showBlockingLoad && tab === 'restore' ? (
            deletedObjects.length === 0 ? (
              <p className="a2-muted">No deleted songs or albums. Restore brings back the definition only — not album links or artwork references.</p>
            ) : (
              <ul className="a2-deleted-list">
                {deletedObjects.map((obj) => (
                  <li key={obj.id} className="a2-deleted-row">
                    <div className="a2-deleted-row-main">
                      <span className="a2-deleted-kind">{objectKindLabel(obj)}</span>
                      <strong>{obj.name}</strong>
                      <span className="a2-muted">Deleted {formatCatalogAddedDate(obj.deletedAt ?? undefined)}</span>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === obj.id}
                      onClick={() => void handleRestore(obj.id)}
                    >
                      {busyId === obj.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {!showBlockingLoad && tab === 'reports' ? (
            deletionReports.length === 0 ? (
              <p className="a2-muted">
                No active deletion reports. Reports appear when a delete removed references elsewhere — use them to know what to repair.
              </p>
            ) : (
              <>
                <div className="a2-deleted-reports-toolbar">
                  <button
                    type="button"
                    className="a2-secondary"
                    disabled={busyId === 'clear-all'}
                    onClick={() => {
                      setBusyId('clear-all');
                      void onClearAllReports().finally(() => setBusyId(null));
                    }}
                  >
                    Clear all reports
                  </button>
                </div>
                <ul className="a2-report-list">
                  {deletionReports.map((report) => {
                    const expanded = expandedReportId === report.id;
                    return (
                      <li key={report.id} className="a2-report-row">
                        <button
                          type="button"
                          className="a2-report-summary"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedReportId((current) => (current === report.id ? null : report.id))
                          }
                        >
                          <span className="a2-deleted-kind">{reportKindLabel(report)}</span>
                          <strong>{report.deletedName}</strong>
                          <span className="a2-muted">
                            {formatCatalogAddedDate(report.createdAt)} · {report.brokenRefs.length}{' '}
                            {report.brokenRefs.length === 1 ? 'reference' : 'references'} removed
                          </span>
                        </button>
                        {expanded ? (
                          <div className="a2-report-detail">
                            {report.snapshot.filePath ? (
                              <p>
                                <span className="a2-muted">File:</span>{' '}
                                <code>{String(report.snapshot.filePath)}</code>
                              </p>
                            ) : null}
                            <ul className="a2-delete-impact-list">
                              {report.brokenRefs.map((ref, index) => (
                                <li key={`${ref.parentId}-${index}`} className="a2-report-ref-row">
                                  <span>{refLine(ref)}</span>
                                  {onRepairRef &&
                                  ref.refKind === 'containerMembership' &&
                                  report.deletedKind === 'song' ? (
                                    <button
                                      type="button"
                                      className="a2-secondary"
                                      disabled={busyId === `${report.id}-${index}`}
                                      title="Restore the Song first if needed, then re-add it to this container"
                                      onClick={() => {
                                        setBusyId(`${report.id}-${index}`);
                                        void onRepairRef(report.id, index).finally(() =>
                                          setBusyId(null),
                                        );
                                      }}
                                    >
                                      {busyId === `${report.id}-${index}`
                                        ? 'Re-linking…'
                                        : 'Re-add to container'}
                                    </button>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              className="a2-secondary"
                              disabled={busyId === report.id}
                              onClick={() => void handleClearReport(report.id)}
                            >
                              {busyId === report.id ? 'Clearing…' : 'Clear report'}
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
