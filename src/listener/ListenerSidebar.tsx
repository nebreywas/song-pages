import { useEffect, useRef, useState } from 'react';
import { IconAdd, IconRefresh } from './PlayerIcons';
import { artistInitials, resolveArtistPhotoUrl } from './artistDisplay';
import { isLikedSongsArtist } from './likedSongs';
import { isSunoDemoArtistId, SUNO_DEMO_FEATURE_ENABLED } from '@shared/demo/sunoDemoFeature';
import { isUserPlaylistArtistId } from '@shared/listener/userPlaylists';
import { sidebarEntryType, sidebarEntryTypeLabel, isSidebarPlaylistContextTarget } from './sidebarEntry';
import type { ArtistRow } from '../types/app';

const SIDEBAR_COLLAPSED_KEY = 'ui.listenerSidebarCollapsed';
const SIDEBAR_WIDTH_KEY = 'ui.listenerSidebarWidth';
const SIDEBAR_WIDTH_MS = 220;
const BRAND_TITLE_MS = 340;
const FULL_BRAND_TITLE = 'Song Pages';

export const DEFAULT_SIDEBAR_WIDTH = 304;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 560;

export { SIDEBAR_COLLAPSED_KEY, SIDEBAR_WIDTH_KEY };

type ListenerSidebarProps = {
  artists: ArtistRow[];
  selectedArtistId: number | null;
  collapsed: boolean;
  busy: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
  onSubscribe: () => void;
  onAddSunoPlaylist?: () => void;
  onAddCustomPlaylist?: () => void;
  onRefresh: () => void;
  onSelectArtist: (artistId: number) => void;
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

/** Small menu opened from the + button — subscribe or create a Suno playlist. */
function SidebarAddMenu({
  open,
  busy,
  sunoEnabled,
  onClose,
  onSubscribe,
  onAddSunoPlaylist,
  onAddCustomPlaylist,
}: {
  open: boolean;
  busy: boolean;
  sunoEnabled: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  onAddSunoPlaylist?: () => void;
  onAddCustomPlaylist?: () => void;
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
        Add artist
      </button>
      {sunoEnabled && onAddSunoPlaylist ? (
        <button
          type="button"
          className="sidebar-add-menu-item"
          role="menuitem"
          disabled={busy}
          onClick={() => {
            onClose();
            onAddSunoPlaylist();
          }}
        >
          Add Suno playlist
        </button>
      ) : null}
      {onAddCustomPlaylist ? (
        <button
          type="button"
          className="sidebar-add-menu-item"
          role="menuitem"
          disabled={busy}
          onClick={() => {
            onClose();
            onAddCustomPlaylist();
          }}
        >
          Add custom playlist
        </button>
      ) : null}
    </div>
  );
}

/** Collapsible artist library — table rows when expanded, icon rail when collapsed. */
export function ListenerSidebar({
  artists,
  selectedArtistId,
  collapsed,
  busy,
  onToggleCollapsed,
  onOpenSettings,
  onSubscribe,
  onAddSunoPlaylist,
  onAddCustomPlaylist,
  onRefresh,
  onSelectArtist,
  onRowContextMenu,
}: ListenerSidebarProps) {
  const brandClickTimerRef = useRef<number | null>(null);
  const brandAnimatingRef = useRef(false);
  const [titleRevealed, setTitleRevealed] = useState(!collapsed);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(
    () => () => {
      if (brandClickTimerRef.current != null) {
        window.clearTimeout(brandClickTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (brandAnimatingRef.current) return;
    setTitleRevealed(!collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (collapsed) setAddMenuOpen(false);
  }, [collapsed]);

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
    isSunoDemoArtistId(selectedArtistId);

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
                    sunoEnabled={SUNO_DEMO_FEATURE_ENABLED}
                    onClose={() => setAddMenuOpen(false)}
                    onSubscribe={onSubscribe}
                    onAddSunoPlaylist={onAddSunoPlaylist}
                    onAddCustomPlaylist={onAddCustomPlaylist}
                  />
                </div>
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
            <div className="library-table-header" aria-hidden="true">
              <span className="library-col-name">Name</span>
              <span className="library-col-type">Type</span>
              <span className="library-col-songs">Songs</span>
            </div>
          ) : null}

          <ul className={`library-list${collapsed ? ' library-list-collapsed' : ''}`}>
            {artists.map((artist) => {
              const isLikedEntry = isLikedSongsArtist(artist.id);
              const isSunoEntry = SUNO_DEMO_FEATURE_ENABLED && isSunoDemoArtistId(artist.id);
              const isCustomEntry = isUserPlaylistArtistId(artist.id);
              const photoUrl = isLikedEntry || isSunoEntry || isCustomEntry ? null : resolveArtistPhotoUrl(artist);
              const isActive = selectedArtistId === artist.id;
              const entryType = sidebarEntryType(artist);
              const typeLabel = sidebarEntryTypeLabel(entryType);
              const songCount =
                typeof artist.song_count === 'number' && Number.isFinite(artist.song_count)
                  ? Math.max(0, artist.song_count)
                  : 0;
              const label = `${artist.artist_name} · ${typeLabel} · ${songCount}`;
              const removable = isSidebarPlaylistContextTarget(entryType);

              const handleContextMenu = (event: React.MouseEvent) => {
                if (!removable || !onRowContextMenu) return;
                event.preventDefault();
                onRowContextMenu(artist, event);
              };

              if (collapsed) {
                return (
                  <li key={artist.id}>
                    <button
                      type="button"
                      className={`library-row library-row-compact${isActive ? ' active' : ''}${
                        isLikedEntry ? ' library-row-liked' : ''
                      }${isSunoEntry ? ' library-row-suno' : ''}${
                        isCustomEntry ? ' library-row-custom' : ''
                      }`}
                      onClick={() => onSelectArtist(artist.id)}
                      aria-label={label}
                      title={label}
                    >
                      {isLikedEntry ? (
                        <span className="library-row-avatar library-row-liked-icon" aria-hidden="true">
                          ♥
                        </span>
                      ) : isSunoEntry ? (
                        <span className="library-row-avatar library-row-avatar-fallback" aria-hidden="true">
                          S
                        </span>
                      ) : isCustomEntry ? (
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
                    </button>
                  </li>
                );
              }

              return (
                <li key={artist.id}>
                  <button
                    type="button"
                    className={`library-row${isActive ? ' active' : ''}${isLikedEntry ? ' library-row-liked' : ''}${isSunoEntry ? ' library-row-suno' : ''}${isCustomEntry ? ' library-row-custom' : ''}`}
                    onClick={() => onSelectArtist(artist.id)}
                    onContextMenu={handleContextMenu}
                    title={label}
                  >
                    <span className="library-col-name">{artist.artist_name}</span>
                    <span className="library-col-type">{typeLabel}</span>
                    <span className="library-col-songs">{songCount}</span>
                  </button>
                </li>
              );
            })}
            {!artists.length ? (
              <li className="empty">{collapsed ? '—' : 'No artists or playlists yet.'}</li>
            ) : null}
          </ul>
        </section>
      </div>
    </aside>
  );
}
