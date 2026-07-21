import { useCallback, useEffect, useRef } from 'react';
import { PlayerOnDeckTitleSuffix, type PlayerOnDeckInfo } from './PlayerOnDeckIndicator';
import { PlayerRadioIndicator } from './PlayerRadioIndicator';
import { PlayerZenIndicator } from './PlayerZenIndicator';

type ScrollingNowPlayingProps = {
  title: string;
  artist: string;
  coverUrl: string | null;
  onDeck?: PlayerOnDeckInfo | null;
  onClearOnDeck?: () => void;
  zenModeActive?: boolean;
  onRemoveZenMode?: () => void;
  radioModeActive?: boolean;
  onRemoveRadioMode?: () => void;
  onCoverDoubleActivate?: () => void;
  /** Single click/press on the song title — jump playlist view to the playing row. */
  onTitleActivate?: () => void;
  /** Jump to the on-deck song from its popover title. */
  onRevealOnDeck?: () => void;
};

/** Mini cover + stacked now playing / title / artist; title marquees when it overflows. */
export function ScrollingNowPlaying({
  title,
  artist,
  coverUrl,
  onDeck = null,
  onClearOnDeck,
  zenModeActive = false,
  onRemoveZenMode,
  radioModeActive = false,
  onRemoveRadioMode,
  onCoverDoubleActivate,
  onTitleActivate,
  onRevealOnDeck,
}: ScrollingNowPlayingProps) {
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const lastCoverTapRef = useRef(0);
  const displayTitle = title.trim() || '—';
  const displayArtist = artist.trim();
  const titleClickable = Boolean(onTitleActivate && displayTitle !== '—');

  const syncScroll = useCallback(() => {
    const wrap = titleWrapRef.current;
    const titleEl = titleRef.current;
    if (!wrap || !titleEl) return;

    titleEl.classList.remove('is-scrolling');
    titleEl.style.removeProperty('--scroll-distance');
    titleEl.style.removeProperty('--scroll-duration');

    const overflow = titleEl.scrollWidth - wrap.clientWidth;
    if (overflow <= 2) return;

    titleEl.style.setProperty('--scroll-distance', `${overflow}px`);
    titleEl.style.setProperty('--scroll-duration', `${Math.max(10, overflow / 18)}s`);
    titleEl.classList.add('is-scrolling');
  }, []);

  useEffect(() => {
    syncScroll();

    const wrap = titleWrapRef.current;
    if (!wrap) return;

    const observer = new ResizeObserver(() => syncScroll());
    observer.observe(wrap);

    return () => observer.disconnect();
  }, [displayTitle, syncScroll]);

  const handleCoverDoubleActivate = useCallback(() => {
    onCoverDoubleActivate?.();
  }, [onCoverDoubleActivate]);

  const handleCoverClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!onCoverDoubleActivate) return;
    if (event.detail === 2) {
      event.preventDefault();
      handleCoverDoubleActivate();
    }
  };

  const handleCoverPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!onCoverDoubleActivate || event.pointerType === 'mouse') return;

    const now = Date.now();
    if (now - lastCoverTapRef.current <= 300) {
      lastCoverTapRef.current = 0;
      event.preventDefault();
      handleCoverDoubleActivate();
    } else {
      lastCoverTapRef.current = now;
    }
  };

  return (
    <div className="player-now-playing" aria-live="polite">
      <button
        type="button"
        className="player-now-playing-art-btn"
        onClick={handleCoverClick}
        onPointerUp={handleCoverPointerUp}
        aria-label="Double-click cover art to view song history"
        title="Double-click for song history"
      >
        {coverUrl ? (
          <img
            className="player-now-playing-cover"
            src={coverUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="player-now-playing-cover player-now-playing-cover-fallback" />
        )}
      </button>
      <div className="player-now-playing-meta">
        <div className="player-now-playing-label-row">
          <span className="player-now-playing-label">Now playing</span>
          {/* Active modes read as "Now playing • zen • radio". */}
          {zenModeActive && onRemoveZenMode ? (
            <>
              <span className="player-now-playing-mode-sep" aria-hidden="true">
                •
              </span>
              <PlayerZenIndicator onRemove={onRemoveZenMode} />
            </>
          ) : null}
          {radioModeActive && onRemoveRadioMode ? (
            <>
              <span className="player-now-playing-mode-sep" aria-hidden="true">
                •
              </span>
              <PlayerRadioIndicator onRemove={onRemoveRadioMode} />
            </>
          ) : null}
          {onDeck && onClearOnDeck ? (
            <PlayerOnDeckTitleSuffix
              onDeck={onDeck}
              onCancel={onClearOnDeck}
              onRevealTitle={onRevealOnDeck}
            />
          ) : null}
        </div>
        <div ref={titleWrapRef} className="player-now-playing-title-wrap">
          {titleClickable ? (
            <button
              type="button"
              className="player-now-playing-title-btn"
              onClick={onTitleActivate}
              title="Show this song in the playlist"
              aria-label={`Show ${displayTitle} in the playlist`}
            >
              <span ref={titleRef} className="player-now-playing-title">
                {displayTitle}
              </span>
            </button>
          ) : (
            <span ref={titleRef} className="player-now-playing-title">
              {displayTitle}
            </span>
          )}
        </div>
        <span className="player-now-playing-artist">{displayArtist || '\u00A0'}</span>
      </div>
      <span className="sr-only">
        Now playing: {displayTitle}
        {displayArtist ? ` by ${displayArtist}` : ''}
        {zenModeActive ? '; Zen mode active' : ''}
        {radioModeActive ? '; Radio mode active' : ''}
        {onDeck ? `; on deck: ${onDeck.songTitle}` : ''}
      </span>
    </div>
  );
}
