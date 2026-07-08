import { useEffect, useRef, useState } from 'react';
import { IconAdd, IconRefresh } from './PlayerIcons';
import {
  artistInitials,
  formatArtistSongCount,
  resolveArtistPhotoUrl,
} from './artistDisplay';
import { isLikedSongsArtist } from './likedSongs';
import { isSunoDemoArtistId, SUNO_DEMO_FEATURE_ENABLED } from '@shared/demo/sunoDemoFeature';
import type { ArtistRow } from '../types/app';

const SIDEBAR_COLLAPSED_KEY = 'ui.listenerSidebarCollapsed';
const SIDEBAR_WIDTH_MS = 220;
const BRAND_TITLE_MS = 340;
const FULL_BRAND_TITLE = 'Song Pages';

export { SIDEBAR_COLLAPSED_KEY };

type ListenerSidebarProps = {
  artists: ArtistRow[];
  selectedArtistId: number | null;
  collapsed: boolean;
  busy: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
  onSubscribe: () => void;
  onRefresh: () => void;
  onSelectArtist: (artistId: number) => void;
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

/** Collapsible artist library — full list or narrow icon rail. */
export function ListenerSidebar({
  artists,
  selectedArtistId,
  collapsed,
  busy,
  onToggleCollapsed,
  onOpenSettings,
  onSubscribe,
  onRefresh,
  onSelectArtist,
}: ListenerSidebarProps) {
  const brandClickTimerRef = useRef<number | null>(null);
  const brandAnimatingRef = useRef(false);
  const [titleRevealed, setTitleRevealed] = useState(!collapsed);

  useEffect(
    () => () => {
      if (brandClickTimerRef.current != null) {
        window.clearTimeout(brandClickTimerRef.current);
      }
    },
    [],
  );

  // Keep label in sync when collapsed is restored from settings (not mid-animation).
  useEffect(() => {
    if (brandAnimatingRef.current) return;
    setTitleRevealed(!collapsed);
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
      // Expand width first while SP stays visible, then spell out Song Pages.
      onToggleCollapsed();
      clearBrandTimer();
      brandClickTimerRef.current = window.setTimeout(() => {
        setTitleRevealed(true);
        brandAnimatingRef.current = false;
        brandClickTimerRef.current = null;
      }, widthMs);
      return;
    }

    // Hide full title back to SP, then collapse width.
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
            <div className="panel-header">
              <h2>Artists</h2>
              <div className="panel-actions panel-actions-end">
                <button
                  type="button"
                  className="btn icon-btn"
                  onClick={onSubscribe}
                  disabled={busy}
                  aria-label="Subscribe to artist"
                  title="Subscribe to artist"
                >
                  <IconAdd />
                </button>
                <button
                  type="button"
                  className="btn icon-btn"
                  onClick={onRefresh}
                  disabled={busy || selectedArtistId === null || isLikedSongsArtist(selectedArtistId) || isSunoDemoArtistId(selectedArtistId)}
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
                disabled={busy || selectedArtistId === null || isLikedSongsArtist(selectedArtistId) || isSunoDemoArtistId(selectedArtistId)}
                aria-label="Refresh artist catalog"
                title="Refresh catalog"
              >
                <IconRefresh />
              </button>
            </div>
          )}

          <ul className={`artist-list${collapsed ? ' artist-list-collapsed' : ''}`}>
            {artists.map((artist) => {
              const isLikedEntry = isLikedSongsArtist(artist.id);
              const isSunoEntry = SUNO_DEMO_FEATURE_ENABLED && isSunoDemoArtistId(artist.id);
              const photoUrl = isLikedEntry || isSunoEntry ? null : resolveArtistPhotoUrl(artist);
              const isActive = selectedArtistId === artist.id;
              const label = `${artist.artist_name} · ${formatArtistSongCount(artist.song_count)}`;

              if (collapsed) {
                return (
                  <li key={artist.id}>
                    <button
                      type="button"
                      className={`artist-item artist-item-compact${isActive ? ' active' : ''}${
                        isLikedEntry ? ' artist-item-liked' : ''
                      }${isSunoEntry ? ' artist-item-suno-only' : ''}`}
                      onClick={() => onSelectArtist(artist.id)}
                      aria-label={label}
                      title={label}
                    >
                      {isLikedEntry ? (
                        <span className="artist-item-avatar artist-item-liked-icon" aria-hidden="true">
                          ♥
                        </span>
                      ) : isSunoEntry ? (
                        <span className="artist-item-avatar artist-item-avatar-fallback" aria-hidden="true">
                          ☀
                        </span>
                      ) : photoUrl ? (
                        <img className="artist-item-avatar" src={photoUrl} alt="" />
                      ) : (
                        <span className="artist-item-avatar artist-item-avatar-fallback" aria-hidden="true">
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
                    className={`artist-item${isActive ? ' active' : ''}${isLikedEntry ? ' artist-item-liked' : ''}${isSunoEntry ? ' artist-item-suno-only' : ''}`}
                    onClick={() => onSelectArtist(artist.id)}
                  >
                    <span className="artist-name">{artist.artist_name}</span>
                    <span className="artist-song-count">{formatArtistSongCount(artist.song_count)}</span>
                  </button>
                </li>
              );
            })}
            {!artists.length ? (
              <li className="empty">{collapsed ? '—' : 'No artists yet.'}</li>
            ) : null}
          </ul>
        </section>
      </div>
    </aside>
  );
}
