import { useEffect, useRef, useState } from 'react';
import { IconAdd, IconRefresh, IconSidebarOrder } from './PlayerIcons';
import { artistInitials, resolveArtistPhotoUrl } from './artistDisplay';
import { AnimatedSpeakerEmoji, SpeakerIconGlyph } from './AnimatedSpeakerEmoji';
import { isLikedSongsArtist } from './likedSongs';
import { isUserPlaylistArtistId } from '@shared/listener/userPlaylists';
import type { SidebarLibrarySortColumn, SidebarLibrarySortDirection } from '@shared/listener/sidebarLibraryOrder';
import {
  sidebarEntryType,
  sidebarLibraryRowLabel,
  isSidebarPlaylistContextTarget,
  isSidebarPlaylistEntry,
} from './sidebarEntry';
import { LibraryEntryTypeCell } from './LibraryEntryTypeCell';
import { formatPlaylistDateAdded } from '@shared/listener/formatPlaylistDate';
import { LibrarySortHeader } from './LibrarySortHeader';
import { useSidebarLibraryDragReorder } from './useSidebarLibraryDragReorder';
import type { ArtistRow } from '../types/app';

const SIDEBAR_COLLAPSED_KEY = 'ui.listenerSidebarCollapsed';
const SIDEBAR_WIDTH_KEY = 'ui.listenerSidebarWidth';
const SIDEBAR_WIDTH_MS = 220;
const BRAND_TITLE_MS = 340;
const FULL_BRAND_TITLE = 'Song Pages';
/** Defer compact-rail single-click until after typical double-click interval. */
const LIBRARY_COMPACT_DOUBLE_CLICK_MS = 450;

export const DEFAULT_SIDEBAR_WIDTH = 304;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 560;
/** Sidebar must be at least this wide before the Added column is shown. */
export const LIBRARY_ADDED_COLUMN_MIN_WIDTH = 360;

export { SIDEBAR_COLLAPSED_KEY, SIDEBAR_WIDTH_KEY };

type ListenerSidebarProps = {
  artists: ArtistRow[];
  orderNumberById: Map<number, number>;
  sortColumn: SidebarLibrarySortColumn;
  sortDirection: SidebarLibrarySortDirection;
  onSortColumn: (column: SidebarLibrarySortColumn) => void;
  onSidebarReorder: (fromIndex: number, toIndex: number) => void;
  onEnterReorderMode?: () => void;
  selectedArtistId: number | null;
  /** Playlist / artist currently feeding the transport queue. */
  nowPlayingPlaylistId?: number | null;
  /** True when transport is actively playing (speaker animates only then). */
  nowPlayingIsPlaying?: boolean;
  collapsed: boolean;
  busy: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
  onSubscribe: () => void;
  onAddPlaylist?: () => void;
  onRefresh: () => void;
  onSelectArtist: (artistId: number) => void;
  /** Double-click any library row — start playback from the first song on its list. */
  onPlaylistDoubleClick?: (artistId: number) => void;
  onRowContextMenu?: (artist: ArtistRow, event: React.MouseEvent) => void;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Crossfades SP ↔ Song Pages with a staggered letter reveal on expand. */
function ListenerBrandLabel({ titleRevealed }: { titleRevealed: boolean }) {
  return (
    <span className="listener-brand-label">
      <span
        className={`listener-brand-mark${titleRevealed ? ' is-hidden' : ' is-visible'}`}
        aria-hidden={titleRevealed}
      >
        SP
      </span>
      <span
        className={`listener-brand-full app-title${titleRevealed ? ' is-visible' : ' is-hidden'}`}
        aria-hidden={!titleRevealed}
      >
        {FULL_BRAND_TITLE.split('').map((char, index) => (
          <span
            key={`${index}-${char}`}
            className="listener-brand-letter"
            style={{
              transitionDelay: titleRevealed
                ? `${index * 32}ms`
                : `${(FULL_BRAND_TITLE.length - 1 - index) * 16}ms`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Small menu opened from the + button — subscribe or create a playlist. */
function SidebarAddMenu({
  open,
  busy,
  onClose,
  onSubscribe,
  onAddPlaylist,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  onAddPlaylist?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sidebar-add-menu" ref={menuRef} role="menu">
      <button
        type="button"
        className="sidebar-add-menu-item"
        role="menuitem"
        disabled={busy}
        onClick={() => {
          onClose();
          onSubscribe();
        }}
      >
        Add Artist Pages
      </button>
      {onAddPlaylist ? (
        <button
          type="button"
          className="sidebar-add-menu-item"
          role="menuitem"
          disabled={busy}
          onClick={() => {
            onClose();
            onAddPlaylist();
          }}
        >
          Add playlist
        </button>
      ) : null}
    </div>
  );
}

/** Collapsible artist library — table rows when expanded, icon rail when collapsed. */
export function ListenerSidebar({
  artists,
  orderNumberById,
  sortColumn,
  sortDirection,
  onSortColumn,
  onSidebarReorder,
  onEnterReorderMode,
  selectedArtistId,
  nowPlayingPlaylistId = null,
  nowPlayingIsPlaying = false,
  collapsed,
  busy,
  onToggleCollapsed,
  onOpenSettings,
  onSubscribe,
  onAddPlaylist,
  onRefresh,
  onSelectArtist,
  onPlaylistDoubleClick,
  onRowContextMenu,
}: ListenerSidebarProps) {
  const brandClickTimerRef = useRef<number | null>(null);
  const rowClickTimerRef = useRef<number | null>(null);
  const lastCompactRowTapRef = useRef<{ artistId: number; at: number } | null>(null);
  const brandAnimatingRef = useRef(false);
  const [titleRevealed, setTitleRevealed] = useState(!collapsed);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const draggableRowCount = artists.filter((artist) => !isLikedSongsArtist(artist.id)).length;
  const sidebarDrag = useSidebarLibraryDragReorder({
    rowCount: draggableRowCount,
    enabled: reorderMode,
    onReorder: onSidebarReorder,
  });

  useEffect(
    () => () => {
      if (brandClickTimerRef.current != null) {
        window.clearTimeout(brandClickTimerRef.current);
      }
      if (rowClickTimerRef.current != null) {
        window.clearTimeout(rowClickTimerRef.current);
      }
    },
    [],
  );

  const clearRowClickTimer = () => {
    if (rowClickTimerRef.current != null) {
      window.clearTimeout(rowClickTimerRef.current);
      rowClickTimerRef.current = null;
    }
  };

  const handleLibraryRowClick = (artistId: number) => {
    clearRowClickTimer();
    rowClickTimerRef.current = window.setTimeout(() => {
      rowClickTimerRef.current = null;
      onSelectArtist(artistId);
    }, 250);
  };

  const handleLibraryRowDoubleClick = (artist: ArtistRow) => {
    clearRowClickTimer();
    if (onPlaylistDoubleClick) {
      onPlaylistDoubleClick(artist.id);
      return;
    }
    onSelectArtist(artist.id);
  };

  /** Collapsed icon rail — count paired clicks; native dblclick is unreliable on nested avatars. */
  const handleCompactRowActivate = (artist: ArtistRow, entryType: ReturnType<typeof sidebarEntryType>) => {
    clearRowClickTimer();
    const now = Date.now();
    const last = lastCompactRowTapRef.current;

    if (last?.artistId === artist.id && now - last.at <= LIBRARY_COMPACT_DOUBLE_CLICK_MS) {
      lastCompactRowTapRef.current = null;
      handleLibraryRowDoubleClick(artist);
      return;
    }

    lastCompactRowTapRef.current = { artistId: artist.id, at: now };
    rowClickTimerRef.current = window.setTimeout(() => {
      rowClickTimerRef.current = null;
      lastCompactRowTapRef.current = null;
      onSelectArtist(artist.id);
    }, LIBRARY_COMPACT_DOUBLE_CLICK_MS);
  };

  useEffect(() => {
    if (brandAnimatingRef.current) return;
    setTitleRevealed(!collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (collapsed) {
      setAddMenuOpen(false);
      setReorderMode(false);
    }
  }, [collapsed]);

  const toggleReorderMode = () => {
    setReorderMode((active) => {
      const next = !active;
      if (next) onEnterReorderMode?.();
      return next;
    });
  };

  const clearBrandTimer = () => {
    if (brandClickTimerRef.current != null) {
      window.clearTimeout(brandClickTimerRef.current);
      brandClickTimerRef.current = null;
    }
  };

  const runBrandToggle = () => {
    if (brandAnimatingRef.current) return;

    const reducedMotion = prefersReducedMotion();
    const widthMs = reducedMotion ? 0 : SIDEBAR_WIDTH_MS;
    const titleMs = reducedMotion ? 0 : BRAND_TITLE_MS;

    brandAnimatingRef.current = true;

    if (collapsed) {
      onToggleCollapsed();
      clearBrandTimer();
      brandClickTimerRef.current = window.setTimeout(() => {
        setTitleRevealed(true);
        brandAnimatingRef.current = false;
        brandClickTimerRef.current = null;
      }, widthMs);
      return;
    }

    setTitleRevealed(false);
    clearBrandTimer();
    brandClickTimerRef.current = window.setTimeout(() => {
      onToggleCollapsed();
      brandAnimatingRef.current = false;
      brandClickTimerRef.current = null;
    }, titleMs);
  };

  const handleBrandClick = () => {
    clearBrandTimer();
    brandClickTimerRef.current = window.setTimeout(() => {
      brandClickTimerRef.current = null;
      runBrandToggle();
    }, 250);
  };

  const handleBrandDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    clearBrandTimer();
    onOpenSettings();
  };

  const brandHint = collapsed
    ? 'Click to expand · double-click for settings'
    : 'Click to collapse · double-click for settings';

  const refreshDisabled =
    busy ||
    selectedArtistId === null ||
    isLikedSongsArtist(selectedArtistId) ||
    isUserPlaylistArtistId(selectedArtistId);

  return (
    <aside className={`listener-sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="listener-brand panel"
        onClick={handleBrandClick}
        onDoubleClick={handleBrandDoubleClick}
        title={brandHint}
        aria-label={
          titleRevealed && !collapsed
            ? 'Song Pages — collapse sidebar'
            : 'Song Pages — expand sidebar'
        }
      >
        <ListenerBrandLabel titleRevealed={titleRevealed} />
      </button>

      <div className="listener-sidebar-body">
        <section className="panel artists-panel">
          {!collapsed ? (
            <div className="panel-header library-panel-header">
              <h2>Artists &amp; Playlists</h2>
              <div className="panel-actions panel-actions-end library-panel-actions">
                <div className="sidebar-add-anchor">
                  <button
                    type="button"
                    className="btn icon-btn"
                    onClick={() => setAddMenuOpen((open) => !open)}
                    disabled={busy}
                    aria-label="Add artist or playlist"
                    aria-expanded={addMenuOpen}
                    aria-haspopup="menu"
                    title="Add artist or playlist"
                  >
                    <IconAdd />
                  </button>
                  <SidebarAddMenu
                    open={addMenuOpen}
                    busy={busy}
                    onClose={() => setAddMenuOpen(false)}
                    onSubscribe={onSubscribe}
                    onAddPlaylist={onAddPlaylist}
                  />
                </div>
                <button
                  type="button"
                  className={`btn icon-btn${reorderMode ? ' active' : ''}`}
                  onClick={toggleReorderMode}
                  disabled={busy || draggableRowCount < 2}
                  aria-label="Reorder playlists"
                  aria-pressed={reorderMode}
                  title="Reorder playlists"
                >
                  <IconSidebarOrder />
                </button>
                <button
                  type="button"
                  className="btn icon-btn"
                  onClick={onRefresh}
                  disabled={refreshDisabled}
                  aria-label="Refresh artist catalog"
                  title="Refresh catalog"
                >
                  <IconRefresh />
                </button>
              </div>
            </div>
          ) : (
            <div className="listener-sidebar-rail-actions">
              <button
                type="button"
                className="btn icon-btn listener-rail-icon-btn"
                onClick={onSubscribe}
                disabled={busy}
                aria-label="Subscribe to artist"
                title="Subscribe to artist"
              >
                <IconAdd />
              </button>
              <button
                type="button"
                className="btn icon-btn listener-rail-icon-btn"
                onClick={onRefresh}
                disabled={refreshDisabled}
                aria-label="Refresh artist catalog"
                title="Refresh catalog"
              >
                <IconRefresh />
              </button>
            </div>
          )}

          {!collapsed ? (
            <>
              <div
                className={`library-table-header${reorderMode ? ' library-table-header--reorder-mode' : ''}`}
                aria-hidden="true"
              >
                {reorderMode ? <span className="library-col-drag" aria-hidden="true" /> : null}
                <LibrarySortHeader
                  label="#"
                  column="order"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={onSortColumn}
                  className="library-col-order"
                />
                <LibrarySortHeader
                  label="Name"
                  column="name"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={onSortColumn}
                  className="library-col-name"
                />
                <LibrarySortHeader
                  label="Type"
                  column="type"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={onSortColumn}
                  className="library-col-type"
                  align="right"
                />
                <LibrarySortHeader
                  label="Added"
                  column="added"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={onSortColumn}
                  className="library-col-added"
                  align="right"
                />
                <LibrarySortHeader
                  label="Songs"
                  column="songs"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={onSortColumn}
                  className="library-col-songs"
                  align="right"
                />
              </div>

              <ul
                className={`library-list${reorderMode ? ' library-list--reorder-mode' : ''}${sidebarDrag.isDragging ? ' is-dragging-library' : ''}`}
              >
              {(() => {
              let draggableIndex = -1;
              return artists.map((artist) => {
              const isLikedEntry = isLikedSongsArtist(artist.id);
              const isPlaylistEntry = isUserPlaylistArtistId(artist.id);
              const rowDraggableIndex = isLikedEntry ? null : ++draggableIndex;
              const isActive = selectedArtistId === artist.id;
              const isNowPlayingSource = nowPlayingPlaylistId != null && artist.id === nowPlayingPlaylistId;
              const entryType = sidebarEntryType(artist);
              const songCount =
                typeof artist.song_count === 'number' && Number.isFinite(artist.song_count)
                  ? Math.max(0, artist.song_count)
                  : 0;
              const label = sidebarLibraryRowLabel(artist.artist_name, entryType, songCount);
              const removable = isSidebarPlaylistContextTarget(entryType);

              const handleContextMenu = (event: React.MouseEvent) => {
                if (!removable || !onRowContextMenu) return;
                event.preventDefault();
                onRowContextMenu(artist, event);
              };

              return (
                <li
                  key={artist.id}
                  ref={
                    rowDraggableIndex == null
                      ? undefined
                      : (node) => sidebarDrag.setRowRef(rowDraggableIndex, node)
                  }
                  className={
                    rowDraggableIndex == null ? undefined : sidebarDrag.rowDragClassName(rowDraggableIndex)
                  }
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className={`library-row${isActive ? ' active' : ''}${isNowPlayingSource ? ' library-row--now-playing' : ''}${isLikedEntry ? ' library-row-liked' : ''}${isPlaylistEntry ? ' library-row-custom' : ''}${reorderMode ? ' library-row--reorder-mode' : ''}`}
                    onClick={() => handleLibraryRowClick(artist.id)}
                    onDoubleClick={() => handleLibraryRowDoubleClick(artist)}
                    onContextMenu={handleContextMenu}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleLibraryRowClick(artist.id);
                      }
                    }}
                    title={isNowPlayingSource ? `${label} — now playing` : label}
                  >
                    {reorderMode && rowDraggableIndex != null ? (
                      <span
                        className="library-col-drag"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="playlist-drag-handle"
                          aria-label={`Drag ${artist.artist_name}`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            sidebarDrag.startDrag(rowDraggableIndex, event.pointerId);
                          }}
                        >
                          ⋮⋮
                        </button>
                      </span>
                    ) : reorderMode ? (
                      <span className="library-col-drag" aria-hidden="true" />
                    ) : null}
                    <span
                      className="library-col-order"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {!isLikedEntry ? (
                        <span className="library-order-index">{orderNumberById.get(artist.id) ?? ''}</span>
                      ) : null}
                    </span>
                    <span className={`library-col-name${isNowPlayingSource ? ' is-now-playing' : ''}`}>
                      {isNowPlayingSource ? (
                        <>
                          <AnimatedSpeakerEmoji
                            className="now-playing-speaker-emoji"
                            animating={nowPlayingIsPlaying}
                          />
                          {'\u00A0'}
                        </>
                      ) : null}
                      {artist.artist_name}
                    </span>
                    <span className="library-col-type">
                      <LibraryEntryTypeCell type={entryType} />
                    </span>
                    <span className="library-col-added">
                      {isLikedEntry ? '' : formatPlaylistDateAdded(artist.created_at)}
                    </span>
                    <span className="library-col-songs">{songCount}</span>
                  </div>
                </li>
              );
            });
            })()}
            {!artists.length ? (
              <li className="empty">No artists or playlists yet.</li>
            ) : null}
              </ul>
            </>
          ) : (
            <ul className="library-list library-list-collapsed">
              {(() =>
                artists.map((artist) => {
                  const isLikedEntry = isLikedSongsArtist(artist.id);
                  const isPlaylistEntry = isUserPlaylistArtistId(artist.id);
                  const entryType = sidebarEntryType(artist);
                  const songCount =
                    typeof artist.song_count === 'number' && Number.isFinite(artist.song_count)
                      ? Math.max(0, artist.song_count)
                      : 0;
                  const label = sidebarLibraryRowLabel(artist.artist_name, entryType, songCount);
                  const photoUrl =
                    isLikedEntry || isPlaylistEntry ? null : resolveArtistPhotoUrl(artist);
                  const isActive = selectedArtistId === artist.id;
                  const isNowPlayingSource =
                    nowPlayingPlaylistId != null && artist.id === nowPlayingPlaylistId;

                  const removable = isSidebarPlaylistContextTarget(entryType);

                  const handleContextMenu = (event: React.MouseEvent) => {
                    if (!removable || !onRowContextMenu) return;
                    event.preventDefault();
                    onRowContextMenu(artist, event);
                  };

                  return (
                    <li key={artist.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={`library-row library-row-compact${isActive ? ' active' : ''}${
                          isNowPlayingSource ? ' library-row--now-playing' : ''
                        }${isLikedEntry ? ' library-row-liked' : ''}${
                          isPlaylistEntry ? ' library-row-custom' : ''
                        }`}
                        onClick={() => handleCompactRowActivate(artist, entryType)}
                        onContextMenu={handleContextMenu}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleCompactRowActivate(artist, entryType);
                          }
                        }}
                        aria-label={isNowPlayingSource ? `${label} — now playing` : label}
                        aria-current={isActive ? 'true' : undefined}
                        title={isNowPlayingSource ? `${label} — now playing` : label}
                      >
                        {isLikedEntry ? (
                          <span
                            className="library-row-avatar library-row-avatar-fallback library-row-liked-icon"
                            aria-hidden="true"
                          >
                            ♥
                          </span>
                        ) : isPlaylistEntry ? (
                          <span className="library-row-avatar library-row-avatar-fallback" aria-hidden="true">
                            {artistInitials(artist.artist_name)}
                          </span>
                        ) : photoUrl ? (
                          <img className="library-row-avatar" src={photoUrl} alt="" />
                        ) : (
                          <span className="library-row-avatar library-row-avatar-fallback" aria-hidden="true">
                            {artistInitials(artist.artist_name)}
                          </span>
                        )}
                        {isNowPlayingSource ? (
                          <span className="library-compact-now-playing" aria-hidden="true">
                            <SpeakerIconGlyph animating={nowPlayingIsPlaying} />
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )()}
              {!artists.length ? <li className="empty">—</li> : null}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
