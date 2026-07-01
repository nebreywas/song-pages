import { useCallback, useEffect, useRef } from 'react';

type ScrollingNowPlayingProps = {
  title: string;
};

/** Bounces long titles left-right inside the player bar when they overflow the container. */
export function ScrollingNowPlaying({ title }: ScrollingNowPlayingProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const label = title ? `Now playing: ${title}` : 'Now playing';

  const syncScroll = useCallback(() => {
    const wrap = wrapRef.current;
    const titleEl = titleRef.current;
    if (!wrap || !titleEl) return;

    titleEl.classList.remove('is-scrolling');
    titleEl.style.removeProperty('--scroll-distance');
    titleEl.style.removeProperty('--scroll-duration');

    // Compare full text width to the visible container — scroll only when it overflows.
    const overflow = titleEl.scrollWidth - wrap.clientWidth;
    if (overflow <= 2) return;

    titleEl.style.setProperty('--scroll-distance', `${overflow}px`);
    // ~18px/s keeps the bounce slow and readable.
    titleEl.style.setProperty('--scroll-duration', `${Math.max(10, overflow / 18)}s`);
    titleEl.classList.add('is-scrolling');
  }, []);

  useEffect(() => {
    syncScroll();

    const wrap = wrapRef.current;
    if (!wrap) return;

    const observer = new ResizeObserver(() => syncScroll());
    observer.observe(wrap);

    return () => observer.disconnect();
  }, [label, syncScroll]);

  return (
    <div ref={wrapRef} className="player-now-playing" aria-live="polite">
      <span ref={titleRef} className="player-now-playing-text">
        {label}
      </span>
    </div>
  );
}
