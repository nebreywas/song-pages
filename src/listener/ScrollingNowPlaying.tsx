import { useCallback, useEffect, useRef } from 'react';
import { PlayerOnDeckTitleSuffix, type PlayerOnDeckInfo } from './PlayerOnDeckIndicator';

type ScrollingNowPlayingProps = {
  title: string;
  artist: string;
  coverUrl: string | null;
  onDeck?: PlayerOnDeckInfo | null;
  onClearOnDeck?: () => void;
  onCoverDoubleActivate?: () => void;
};

/** Mini cover + stacked now playing / title / artist; title marquees when it overflows. */
export function ScrollingNowPlaying({
  title,
  artist,
  coverUrl,
  onDeck = null,
  onClearOnDeck,
  onCoverDoubleActivate,
}: ScrollingNowPlayingProps) {
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const lastCoverTapRef = useRef(0);
  const displayTitle = title.trim() || '—';
  const displayArtist = artist.trim() || '—';

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
          {onDeck && onClearOnDeck ? (
            <PlayerOnDeckTitleSuffix onDeck={onDeck} onCancel={onClearOnDeck} />
          ) : null}
        </div>
        <div ref={titleWrapRef} className="player-now-playing-title-wrap">
          <span ref={titleRef} className="player-now-playing-title">
            {displayTitle}
          </span>
        </div>
        <span className="player-now-playing-artist">{displayArtist}</span>
      </div>
      <span className="sr-only">
        Now playing: {displayTitle} by {displayArtist}
        {onDeck ? `; on deck: ${onDeck.songTitle}` : ''}
      </span>
    </div>
  );
}
