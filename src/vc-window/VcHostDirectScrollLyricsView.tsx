import { useEffect, useRef, type CSSProperties } from 'react';

import { getApp } from '../lib/bridge';
import { renderMarkdownPreview } from '../lib/markdownPreview';

type VcHostDirectScrollLyricsViewProps = {
  text: string;
  markdownSource?: boolean;
  /** Precomputed host text style (font / size / color / alignment). */
  textStyle?: CSSProperties;
  /** Feather the top/bottom edges (matches the other lyric modes). */
  edgeFade?: boolean;
  /** Reset scroll to the top whenever the song changes. */
  songId?: string | null;
};

/**
 * "Host Direct Scroll" lyric mode.
 *
 * Unlike Simple Scroll (playback-time transform) and ALARE (timed line reveal),
 * the lyrics here NEVER move on their own. The host drives the scroll position
 * manually, which suits spoken word, sermons, rehearsals, and variable-tempo
 * performances where clock-based scrolling would drift from the real delivery.
 *
 * Three input paths, all landing on the same scroll container:
 *  - Mouse wheel — native `overflow-y: auto` handles it, no code needed.
 *  - Grab-and-drag — pointer down + move adjusts `scrollTop` (with a small dead
 *    zone so a click doesn't jitter the position).
 *  - Bindable commands — `lyric-scroll-forward/back/reset` arrive over the VC
 *    hotkey channel (keyboard accelerator OR a controller button bound to the
 *    command) and nudge/reset the scroll a readable "page-ish" amount.
 */
export function VcHostDirectScrollLyricsView({
  text,
  markdownSource,
  textStyle,
  edgeFade,
  songId,
}: VcHostDirectScrollLyricsViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // New song (or replaced text) → start the host back at the first line.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [songId, text]);

  // Bindable scroll commands (keyboard accelerator or controller button) are
  // broadcast on the shared VC hotkey channel — the same one ALARE speed uses.
  useEffect(() => {
    const app = getApp();
    if (!app?.vc?.onHotkey) return;

    const off = app.vc.onHotkey(({ action }) => {
      const el = scrollRef.current;
      if (!el) return;
      // Advance a readable chunk per press rather than a single pixel.
      const step = Math.max(48, el.clientHeight * 0.4);
      if (action === 'lyricScrollForward') el.scrollBy({ top: step, behavior: 'smooth' });
      else if (action === 'lyricScrollBack') el.scrollBy({ top: -step, behavior: 'smooth' });
      else if (action === 'lyricScrollReset') el.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return () => off();
  }, []);

  // Grab-and-drag scrolling. Wheel scrolling is native to the overflow container.
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || event.button !== 0) return;
    const startY = event.clientY;
    const startScroll = el.scrollTop;
    let dragging = false;
    el.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - startY;
      // Small dead zone so a plain click doesn't shift the scroll position.
      if (!dragging && Math.abs(delta) < 3) return;
      dragging = true;
      el.classList.add('is-grabbing');
      el.scrollTop = startScroll - delta;
    };
    const onUp = () => {
      el.classList.remove('is-grabbing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const containerClass = `vc-lyrics-host-scroll${edgeFade ? ' vc-lyrics-scroll--edge-fade' : ''}`;

  if (markdownSource) {
    const html = renderMarkdownPreview(text);
    if (!html) return <div className="vc-cell-empty" />;
    return (
      <div ref={scrollRef} className={containerClass} onPointerDown={onPointerDown}>
        <div
          className="vc-lyrics-inner vc-host-text-markdown markdown-body"
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={containerClass} onPointerDown={onPointerDown}>
      <div className="vc-lyrics-inner" style={textStyle}>
        {text}
      </div>
    </div>
  );
}
