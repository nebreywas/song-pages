import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  formatHistoryDateCell,
  formatHistoryPlaybackCell,
  formatHistoryPlaylistCell,
  formatHistorySongCell,
  formatHistoryTimeCell,
  formatHistoryVcCell,
  groupSongHistoryBySession,
  type SongHistoryEntry,
} from '@shared/listener/songHistory';

type SongHistoryPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: SongHistoryEntry[];
  loading: boolean;
  playerWindowRef?: React.RefObject<HTMLElement | null>;
  onRequestClear: () => void;
  onAddToPlaylist: (entry: SongHistoryEntry) => void;
  onPutOnDeck: (entry: SongHistoryEntry) => void;
  onPlayNow: (entry: SongHistoryEntry) => void;
  onGoToSong: (entry: SongHistoryEntry) => void;
};

type RowMenuState = {
  entryId: number;
  top: number;
  left: number;
};

/** Activity-log popover for recent playback history. */
export function SongHistoryPopover({
  open,
  onOpenChange,
  entries,
  loading,
  playerWindowRef,
  onRequestClear,
  onAddToPlaylist,
  onPutOnDeck,
  onPlayNow,
  onGoToSong,
}: SongHistoryPopoverProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);

  const updateOverlayBounds = () => {
    const anchor =
      playerWindowRef?.current ??
      overlayRef.current?.closest('.listener-layout') ??
      document.querySelector('.listener-layout');
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setOverlayStyle({
      position: 'fixed',
      top: rect.top,
      left: 0,
      width: window.innerWidth,
      height: rect.height,
      zIndex: 2000,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateOverlayBounds();
    window.addEventListener('resize', updateOverlayBounds);
    window.addEventListener('scroll', updateOverlayBounds, true);
    return () => {
      window.removeEventListener('resize', updateOverlayBounds);
      window.removeEventListener('scroll', updateOverlayBounds, true);
    };
  }, [open, entries.length, playerWindowRef]);

  useEffect(() => {
    if (!open) {
      setRowMenu(null);
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rowMenuRef.current?.contains(target)) return;

      if (rowMenu) {
        setRowMenu(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (rowMenu) setRowMenu(null);
        else onOpenChange(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onOpenChange, open, rowMenu]);

  const openRowMenu = (event: React.MouseEvent<HTMLButtonElement>, entry: SongHistoryEntry) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu({
      entryId: entry.id,
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 168),
    });
  };

  const closeRowMenu = () => setRowMenu(null);

  const activeEntry = rowMenu
    ? entries.find((entry) => entry.id === rowMenu.entryId) ?? null
    : null;

  const sessionGroups = groupSongHistoryBySession(entries);

  const popover =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={overlayRef}
            className="song-history-overlay"
            style={overlayStyle}
            role="presentation"
          >
            <div
              ref={popoverRef}
              className="song-history-popover panel"
              role="dialog"
              aria-label="Song history"
              aria-modal="true"
            >
              <div className="song-history-popover-header">
                <h3 className="song-history-popover-title">Song History</h3>
                <button
                  type="button"
                  className="song-history-popover-close"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close song history"
                >
                  ×
                </button>
              </div>

              <div className="song-history-table-wrap">
                {loading ? (
                  <p className="song-history-empty">Loading history…</p>
                ) : !entries.length ? (
                  <p className="song-history-empty">No playback history yet.</p>
                ) : (
                  <table className="song-history-table">
                    <thead>
                      <tr>
                        <th scope="col">Song</th>
                        <th scope="col">Playlist</th>
                        <th scope="col">Playback</th>
                        <th scope="col">VC Mode</th>
                        <th scope="col">Date</th>
                        <th scope="col">Time</th>
                        <th scope="col" className="song-history-actions-col" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {sessionGroups.map((group) => (
                        <Fragment key={`session-${group.label}`}>
                          <tr className="song-history-session-row">
                            <th colSpan={7} scope="colgroup">
                              {group.label}
                            </th>
                          </tr>
                          {group.entries.map((entry) => (
                            <tr key={entry.id}>
                              <td className="song-history-song-cell">{formatHistorySongCell(entry)}</td>
                              <td>{formatHistoryPlaylistCell(entry)}</td>
                              <td>{formatHistoryPlaybackCell(entry)}</td>
                              <td>{formatHistoryVcCell(entry)}</td>
                              <td className="song-history-date-cell">
                                {formatHistoryDateCell(entry.startedAt)}
                              </td>
                              <td className="song-history-time-cell">
                                {formatHistoryTimeCell(entry.startedAt)}
                              </td>
                              <td className="song-history-actions-col">
                                <button
                                  type="button"
                                  className="song-history-row-menu-btn"
                                  aria-label={`Actions for ${entry.songTitle}`}
                                  onClick={(event) => openRowMenu(event, entry)}
                                >
                                  ⋯
                                </button>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="song-history-popover-footer">
                <button
                  type="button"
                  className="song-history-clear-btn"
                  onClick={onRequestClear}
                  disabled={loading || !entries.length}
                >
                  Clear History
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const rowMenuPortal =
    rowMenu && activeEntry && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={rowMenuRef}
            className="song-history-row-menu panel"
            style={{ position: 'fixed', top: rowMenu.top, left: rowMenu.left, zIndex: 2100 }}
            role="menu"
          >
            <button type="button" role="menuitem" onClick={() => { closeRowMenu(); onAddToPlaylist(activeEntry); }}>
              Add To Playlist
            </button>
            <button type="button" role="menuitem" onClick={() => { closeRowMenu(); onPutOnDeck(activeEntry); }}>
              Put On Deck
            </button>
            <button type="button" role="menuitem" onClick={() => { closeRowMenu(); onPlayNow(activeEntry); }}>
              Play Now
            </button>
            <button type="button" role="menuitem" onClick={() => { closeRowMenu(); onGoToSong(activeEntry); }}>
              Go To Song
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {popover}
      {rowMenuPortal}
    </>
  );
}
