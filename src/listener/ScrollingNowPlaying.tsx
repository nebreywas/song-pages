import { useCallback, useEffect, useRef } from 'react';

type ScrollingNowPlayingProps = {
  title: string;
  artist: string;
  coverUrl: string | null;
};

/** Mini cover + stacked now playing / title / artist; title marquees when it overflows. */
export function ScrollingNowPlaying({ title, artist, coverUrl }: ScrollingNowPlayingProps) {
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
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

  return (
    <div className="player-now-playing" aria-live="polite">
      <div className="player-now-playing-art" aria-hidden="true">
        {coverUrl ? (
          <img className="player-now-playing-cover" src={coverUrl} alt="" />
        ) : (
          <div className="player-now-playing-cover player-now-playing-cover-fallback" />
        )}
      </div>
      <div className="player-now-playing-meta">
        <span className="player-now-playing-label">Now playing</span>
        <div ref={titleWrapRef} className="player-now-playing-title-wrap">
          <span ref={titleRef} className="player-now-playing-title">
            {displayTitle}
          </span>
        </div>
        <span className="player-now-playing-artist">{displayArtist}</span>
      </div>
      <span className="sr-only">
        Now playing: {displayTitle} by {displayArtist}
      </span>
    </div>
  );
}
