import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import { buildAlareTimeline, resolveAlareScrollLinePosition } from '@shared/alare';
import { hostTextCssStyle } from '@shared/hostContent/typography';
import type { HostFontSizeId, HostFontStyleId } from '@shared/hostContent';
import {
  buildMarqueeLyricsLayout,
  measureMarqueeTextWidth,
  resolveMarqueeAlareScrollPx,
  resolveMarqueeSimpleScrollPx,
} from '@shared/marqueeLyrics';
import type { VcLyricTracking, VcTextAlign } from '@shared/vcMode/assignmentSettings';
import type { VcPlaybackState } from '@shared/vcModeTypes';

type VcMarqueeLyricsViewProps = {
  text: string;
  playback: VcPlaybackState;
  fontStyle?: HostFontStyleId;
  fontSize?: HostFontSizeId;
  color?: string;
  textAlign?: VcTextAlign;
  lyricTracking?: VcLyricTracking;
  manifestDurationSeconds?: number | null;
  songId?: string | null;
};

type PlaybackClockAnchor = {
  timeSec: number;
  perfAtMs: number;
  durationSec: number;
  isPlaying: boolean;
};

const MAX_EXTRAPOLATE_SEC = 0.4;

const TRACK_STYLE: CSSProperties = {
  display: 'inline-block',
  width: 'max-content',
  maxWidth: 'none',
  whiteSpace: 'nowrap',
  wordBreak: 'normal',
  overflowWrap: 'normal',
};

function hostTextStyle(
  fontStyle: HostFontStyleId,
  fontSize: HostFontSizeId,
  color: string,
): CSSProperties {
  const style = hostTextCssStyle(fontStyle, fontSize, color);
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };
}

function extrapolatePlaybackTime(clock: PlaybackClockAnchor, nowMs: number): number {
  if (!clock.isPlaying || clock.perfAtMs <= 0) return clock.timeSec;

  const elapsed = Math.min((nowMs - clock.perfAtMs) / 1000, MAX_EXTRAPOLATE_SEC);
  const extrapolated = clock.timeSec + elapsed;
  if (clock.durationSec > 0) return Math.min(extrapolated, clock.durationSec);
  return extrapolated;
}

/** Single-line lyrics that scroll horizontally — Simple Scroll or ALARE pacing. */
export function VcMarqueeLyricsView({
  text,
  playback,
  fontStyle = 'clean',
  fontSize = 'medium',
  color = '#e8ecf4',
  lyricTracking = 'simple-scroll',
  manifestDurationSeconds,
  songId,
}: VcMarqueeLyricsViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef(playback);
  const styleRef = useRef<CSSProperties>({});
  const manifestDurationRef = useRef(manifestDurationSeconds);
  const clockRef = useRef<PlaybackClockAnchor>({
    timeSec: 0,
    perfAtMs: 0,
    durationSec: 0,
    isPlaying: false,
  });

  playbackRef.current = playback;
  manifestDurationRef.current = manifestDurationSeconds;

  const layout = useMemo(() => buildMarqueeLyricsLayout(text), [text]);
  const style = useMemo(() => hostTextStyle(fontStyle, fontSize, color), [fontStyle, fontSize, color]);
  styleRef.current = style;

  const timeline = useMemo(() => {
    if (lyricTracking !== 'alare') return null;
    const duration =
      manifestDurationSeconds != null && manifestDurationSeconds > 0
        ? manifestDurationSeconds
        : playback.duration;
    return buildAlareTimeline({
      songId: songId ?? 'unknown',
      lyricsText: text,
      manifestDurationSeconds,
      playbackDurationSeconds: duration,
    });
  }, [text, songId, manifestDurationSeconds, playback.duration, lyricTracking]);

  useEffect(() => {
    const pb = playbackRef.current;
    clockRef.current = {
      timeSec: pb.currentTime,
      perfAtMs: performance.now(),
      durationSec: pb.duration,
      isPlaying: pb.isPlaying,
    };
  }, [playback.currentTime, playback.duration, playback.isPlaying]);

  // RAF + direct DOM transform; width measured off-screen so only one line paints in the float.
  useEffect(() => {
    if (!layout.text.trim()) return;

    let raf = 0;
    const tick = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (viewport && track) {
        const clock = clockRef.current;
        const wallTime = extrapolatePlaybackTime(clock, performance.now());
        const manifestDuration = manifestDurationRef.current;
        const duration =
          clock.durationSec > 0
            ? clock.durationSec
            : manifestDuration != null && manifestDuration > 0
              ? manifestDuration
              : 0;

        const viewportWidth = viewport.clientWidth;
        const textWidth = Math.max(
          measureMarqueeTextWidth(layout.text, styleRef.current),
          track.scrollWidth,
        );

        let nextScrollPx = 0;
        if (lyricTracking === 'alare' && timeline) {
          const linePos = resolveAlareScrollLinePosition(timeline.lines, wallTime);
          nextScrollPx = resolveMarqueeAlareScrollPx(linePos, layout, textWidth, viewportWidth);
        } else if (duration > 0) {
          nextScrollPx = resolveMarqueeSimpleScrollPx(wallTime / duration, textWidth, viewportWidth);
        }

        track.style.transform = `translateX(${nextScrollPx}px)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, lyricTracking, timeline]);

  if (!layout.text.trim()) {
    return <div className="vc-cell-empty" />;
  }

  return (
    <div className="vc-marquee-lyrics" style={style}>
      <div ref={viewportRef} className="vc-marquee-lyrics-viewport">
        <div ref={trackRef} className="vc-marquee-lyrics-track" style={TRACK_STYLE}>
          {layout.text}
        </div>
      </div>
    </div>
  );
}

/** Static designer preview — mid-song scroll position using the live view. */
export function VcMarqueeLyricsPreview({
  text,
  fontStyle = 'clean',
  fontSize = 'medium',
  color = '#e8ecf4',
  lyricTracking = 'simple-scroll',
}: Omit<VcMarqueeLyricsViewProps, 'playback' | 'manifestDurationSeconds' | 'songId' | 'textAlign'>) {
  const previewDuration = 180;
  const previewTime = previewDuration * (lyricTracking === 'alare' ? 0.35 : 0.4);

  return (
    <VcMarqueeLyricsView
      text={text}
      playback={{ currentTime: previewTime, duration: previewDuration, isPlaying: false }}
      fontStyle={fontStyle}
      fontSize={fontSize}
      color={color}
      lyricTracking={lyricTracking}
    />
  );
}
