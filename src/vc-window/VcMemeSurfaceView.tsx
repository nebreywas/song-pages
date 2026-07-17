import { useEffect, useRef, useState } from 'react';

import type { ActiveMeme } from '@shared/memes/types';

import { getApp } from '../lib/bridge';

/**
 * Renders the host-pushed meme onto a region assigned the `meme-surface` kind.
 *
 * Timing/clear responsibilities are SPLIT with the main renderer:
 *  - Duration-based auto-clear and "play indefinitely" are owned by the main
 *    renderer (useVcModeManager) so they survive a projector reload/resync.
 *  - Roundtrip counting is owned HERE, because only the projector's <video>
 *    element knows when a loop completes. When a minimum roundtrip count is set
 *    (video only — GIFs expose no loop event), we drop the native `loop` and
 *    replay manually, clearing once BOTH the loop count AND the minimum
 *    duration are satisfied ("whichever is greater").
 *
 * Autoplay note: React does NOT reliably set the `muted` DOM *property* from the
 * `muted` prop, and Chromium blocks autoplay of a video it believes has audio.
 * We therefore set `video.muted = true` imperatively via a ref and call play(),
 * otherwise the clip renders frozen/blank.
 *
 * The wrapper is keyed by `meme.token` upstream so a new meme fully remounts.
 */
export function VcMemeSurfaceView({ meme }: { meme: ActiveMeme | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopsRef = useRef(0);
  const [failed, setFailed] = useState(false);

  const token = meme?.token ?? null;

  // Force-mute + kick off playback imperatively (React's `muted` prop is unreliable).
  useEffect(() => {
    loopsRef.current = 0;
    setFailed(false);
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    void el.play().catch((error) => {
      // Autoplay can still be interrupted during teardown / rapid swaps.
      console.warn('[meme] video autoplay blocked', String(error));
    });
  }, [token]);

  if (!meme) {
    // Empty designated region — invisible until the host sends a meme.
    return <div className="vc-cell-empty vc-meme-empty" />;
  }

  const { media, settings } = meme;
  const clearMeme = () => getApp()?.vc?.clearMeme?.();
  const handleClick = settings.clickClears ? clearMeme : undefined;

  const roundtripCounting =
    media.mediaType === 'video' && !settings.playIndefinitely && settings.minRoundtrips > 0;

  const shouldClearAfterLoop = () => {
    const elapsed = Date.now() - meme.startedAt;
    return (
      loopsRef.current >= settings.minRoundtrips &&
      elapsed >= settings.durationSeconds * 1000
    );
  };

  const onEnded = () => {
    loopsRef.current += 1;
    if (shouldClearAfterLoop()) {
      clearMeme();
      return;
    }
    // Not done yet — replay the clip for another roundtrip.
    const el = videoRef.current;
    if (el) {
      el.currentTime = 0;
      void el.play().catch(() => {
        // Autoplay can be interrupted during teardown; safe to ignore.
      });
    }
  };

  const onMediaError = () => {
    // Surfaces in the packaged app log via the renderer console-message forwarder.
    console.error('[meme] media failed to load', {
      mediaType: media.mediaType,
      url: media.url,
    });
    setFailed(true);
  };

  return (
    <div
      className="vc-meme-surface"
      onClick={handleClick}
      style={handleClick ? { cursor: 'pointer' } : undefined}
    >
      {failed ? (
        <div className="vc-meme-error">Meme failed to load</div>
      ) : media.mediaType === 'video' ? (
        <video
          ref={videoRef}
          className="vc-host-video vc-meme-media"
          src={media.url}
          autoPlay
          muted
          playsInline
          loop={!roundtripCounting}
          onEnded={roundtripCounting ? onEnded : undefined}
          onError={onMediaError}
        />
      ) : (
        <img
          className="vc-cover-fit vc-host-fit vc-meme-media"
          src={media.url}
          alt=""
          onError={onMediaError}
        />
      )}
    </div>
  );
}
