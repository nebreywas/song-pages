import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { HOST_FONT_SIZE_PX, hostTextCssStyle } from '@shared/hostContent/typography';
import type { HostFontSizeId, HostFontStyleId } from '@shared/hostContent';
import {
  accumulateAlareSpeedNudgeLines,
  alareBlockGapPx,
  alareLineOpacity,
  alareLinesPerSecond,
  alareScrollOffsetPx,
  buildAlareTimeline,
  resolveAlareScrollLinePosition,
} from '@shared/alare';
import type { AlareTimeline } from '@shared/alare';
import type { VcTextAlign } from '@shared/vcMode/assignmentSettings';
import type { VcPlaybackState } from '@shared/vcModeTypes';

import { AlareLyricsTrackLines } from './AlareLyricsTrackLines';
import { useVcAlareSpeedNudge } from './VcAlareNudgeContext';

const SCROLL_BLEND = 0.65;
const SEEK_DRIFT_SEC = 0.85;
const MAX_EXTRAPOLATE_SEC = 0.4;
const BACKWARD_JITTER_LINE = 0.02;

type PlaybackClockAnchor = {
  timeSec: number;
  perfAtMs: number;
  durationSec: number;
  isPlaying: boolean;
};

type VcAlareLyricsViewProps = {
  text: string;
  songId: string | null;
  manifestDurationSeconds?: number | null;
  playback: VcPlaybackState;
  fontStyle?: HostFontStyleId;
  fontSize?: HostFontSizeId;
  color?: string;
  textAlign?: VcTextAlign;
  fadeEnabled?: boolean;
  targetVisibleLines?: number;
};

function hostTextStyle(
  fontStyle: HostFontStyleId,
  fontSize: HostFontSizeId,
  color: string,
  textAlign?: VcTextAlign,
): CSSProperties {
  const style = hostTextCssStyle(fontStyle, fontSize, color);
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    lineHeight: style.lineHeight,
    ...(textAlign ? { textAlign } : {}),
  };
}

function extrapolatePlaybackTime(clock: PlaybackClockAnchor, nowMs: number): number {
  if (!clock.isPlaying || clock.perfAtMs <= 0) return clock.timeSec;

  const elapsed = Math.min((nowMs - clock.perfAtMs) / 1000, MAX_EXTRAPOLATE_SEC);
  const extrapolated = clock.timeSec + elapsed;
  if (clock.durationSec > 0) return Math.min(extrapolated, clock.durationSec);
  return extrapolated;
}

function songLockKey(songId: string | null, lyricsText: string): string {
  return `${songId ?? 'unknown'}|${lyricsText.length}|${lyricsText.slice(0, 64)}`;
}

/** ALARE vertical multi-line lyrics — smooth scroll along approximate timeline. */
export function VcAlareLyricsView({
  text,
  songId,
  manifestDurationSeconds,
  playback,
  fontStyle = 'clean',
  fontSize = 'medium',
  color = '#e8ecf4',
  textAlign,
  fadeEnabled = true,
  targetVisibleLines,
}: VcAlareLyricsViewProps) {
  const alareSpeedNudge = useVcAlareSpeedNudge();
  const containerRef = useRef<HTMLDivElement>(null);
  const [geometryLines, setGeometryLines] = useState(5);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [slotHeightPx, setSlotHeightPx] = useState(0);
  const [smoothScrollPosition, setSmoothScrollPosition] = useState(0);
  const smoothRef = useRef(0);
  const playbackRef = useRef(playback);
  const speedNudgeRef = useRef(alareSpeedNudge);
  const nudgeLineOffsetRef = useRef(0);
  const lastRafMsRef = useRef(0);
  const forceScrollResyncRef = useRef(true);
  const songLockKeyRef = useRef('');
  const lockedTimelineRef = useRef<AlareTimeline | null>(null);
  const clockRef = useRef<PlaybackClockAnchor>({
    timeSec: 0,
    perfAtMs: 0,
    durationSec: 0,
    isPlaying: false,
  });

  playbackRef.current = playback;

  const prevNudge = useRef(alareSpeedNudge);
  if (alareSpeedNudge !== prevNudge.current) {
    if (alareSpeedNudge === 0) nudgeLineOffsetRef.current = 0;
    prevNudge.current = alareSpeedNudge;
  }
  speedNudgeRef.current = alareSpeedNudge;

  const lineHeightPx = HOST_FONT_SIZE_PX[fontSize] * 1.35;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const height = container.clientHeight;
      const paddingY = 24;
      const usable = Math.max(lineHeightPx, height - paddingY);
      const fit = Math.max(1, Math.floor(usable / lineHeightPx));
      setGeometryLines(fit);
      setViewportHeight(height);

      const sample = container.querySelector<HTMLElement>('.vc-alare-lyrics-line');
      if (sample) {
        const slot = sample.offsetHeight + parseFloat(getComputedStyle(sample).marginBottom || '0');
        if (slot > 0) setSlotHeightPx(slot);
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [lineHeightPx, text, fontSize]);

  const candidateTimeline = useMemo(() => {
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
  }, [text, songId, manifestDurationSeconds, playback.duration]);

  const lockKey = songLockKey(songId, text);
  if (lockKey !== songLockKeyRef.current) {
    songLockKeyRef.current = lockKey;
    lockedTimelineRef.current = null;
    nudgeLineOffsetRef.current = 0;
    lastRafMsRef.current = 0;
    forceScrollResyncRef.current = true;
  }

  if (!lockedTimelineRef.current && candidateTimeline) {
    lockedTimelineRef.current = candidateTimeline;
  }

  const timeline = lockedTimelineRef.current ?? candidateTimeline;

  const visibleLineCount = Math.max(
    1,
    Math.min(geometryLines, targetVisibleLines ?? geometryLines),
  );
  const visibleRadius = Math.max(1, visibleLineCount / 2);

  const scrollTargetForWallTime = (wallTimeSec: number) => {
    if (!timeline) return 0;
    const base = resolveAlareScrollLinePosition(timeline.lines, wallTimeSec);
    const maxLine = timeline.lines.length - 1;
    return Math.min(maxLine, base + nudgeLineOffsetRef.current);
  };

  const syncScrollToPlayback = (wallTimeSec: number) => {
    const pos = scrollTargetForWallTime(wallTimeSec);
    smoothRef.current = pos;
    setSmoothScrollPosition(pos);
    return pos;
  };

  useEffect(() => {
    if (!timeline) return;
    const pb = playbackRef.current;
    syncScrollToPlayback(pb.currentTime);
    clockRef.current = {
      timeSec: pb.currentTime,
      perfAtMs: performance.now(),
      durationSec: pb.duration,
      isPlaying: pb.isPlaying,
    };
  }, [lockKey, timeline]);

  useEffect(() => {
    if (!timeline) return;

    const nowMs = performance.now();
    const prev = clockRef.current;
    const expected = extrapolatePlaybackTime(prev, nowMs);
    const drift = playback.currentTime - expected;
    const seeked = Math.abs(drift) >= SEEK_DRIFT_SEC || playback.currentTime + 0.15 < expected;

    if (seeked || !playback.isPlaying) {
      forceScrollResyncRef.current = true;
      syncScrollToPlayback(playback.currentTime);
    }

    clockRef.current = {
      timeSec: playback.currentTime,
      perfAtMs: nowMs,
      durationSec: playback.duration,
      isPlaying: playback.isPlaying,
    };
  }, [timeline, playback.currentTime, playback.isPlaying, playback.duration]);

  useEffect(() => {
    if (!timeline) return;

    let raf = 0;
    const tick = () => {
      const clock = clockRef.current;
      const nowMs = performance.now();
      const wallTime = extrapolatePlaybackTime(clock, nowMs);

      if (lastRafMsRef.current > 0 && clock.isPlaying && speedNudgeRef.current !== 0) {
        const deltaSec = (nowMs - lastRafMsRef.current) / 1000;
        nudgeLineOffsetRef.current = accumulateAlareSpeedNudgeLines(
          nudgeLineOffsetRef.current,
          deltaSec,
          speedNudgeRef.current,
          alareLinesPerSecond(timeline),
        );
      }
      lastRafMsRef.current = nowMs;

      const target = scrollTargetForWallTime(wallTime);
      const prev = smoothRef.current;

      let next: number;
      if (!clock.isPlaying || forceScrollResyncRef.current) {
        next = target;
        forceScrollResyncRef.current = false;
      } else {
        next = prev + (target - prev) * SCROLL_BLEND;
        if (Math.abs(target - next) < 0.0005) next = target;
        if (next < prev && target >= prev - BACKWARD_JITTER_LINE) next = prev;
      }

      smoothRef.current = next;
      setSmoothScrollPosition(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeline]);

  const effectiveSlotHeight = slotHeightPx > 0 ? slotHeightPx : lineHeightPx * 1.15;
  const blockGapPx = alareBlockGapPx(lineHeightPx);
  const scrollOffsetPx = timeline
    ? alareScrollOffsetPx(smoothScrollPosition, timeline.lines, effectiveSlotHeight, blockGapPx)
    : 0;
  const trackOffset =
    viewportHeight > 0 ? viewportHeight / 2 - scrollOffsetPx - lineHeightPx / 2 : 0;

  const style = hostTextStyle(fontStyle, fontSize, color, textAlign);

  if (!timeline || timeline.lines.length === 0) {
    return <div className="vc-cell-empty" />;
  }

  return (
    <div ref={containerRef} className="vc-alare-lyrics" style={style}>
      <div className="vc-alare-lyrics-viewport">
        <div
          className="vc-alare-lyrics-track"
          style={{ transform: `translateY(${trackOffset}px)` }}
        >
          <AlareLyricsTrackLines
            lines={timeline.lines}
            scrollLinePosition={smoothScrollPosition}
            blockGapPx={blockGapPx}
            lineOpacity={(lineIndex, scrollPos) =>
              alareLineOpacity(lineIndex, scrollPos, fadeEnabled, visibleRadius)
            }
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Static ALARE layout preview for the Surface designer (no timing playback).
 */
export function VcAlareLyricsPreview({
  text,
  fontStyle = 'clean',
  fontSize = 'medium',
  color = '#e8ecf4',
  textAlign,
  fadeEnabled = true,
  targetVisibleLines = 5,
}: Omit<VcAlareLyricsViewProps, 'playback' | 'songId' | 'manifestDurationSeconds'>) {
  const timeline = useMemo(
    () =>
      buildAlareTimeline({
        songId: 'preview',
        lyricsText: text,
        manifestDurationSeconds: 180,
        playbackDurationSeconds: 180,
      }),
    [text],
  );

  const visibleLineCount = Math.max(1, Math.min(9, targetVisibleLines));
  const activeIndex = timeline ? Math.floor(timeline.lines.length / 2) : 0;
  const lineHeightPx = HOST_FONT_SIZE_PX[fontSize] * 1.35;
  const blockGapPx = alareBlockGapPx(lineHeightPx);
  const style = hostTextStyle(fontStyle, fontSize, color, textAlign);

  if (!timeline || timeline.lines.length === 0) {
    return <div className="vc-designer-preview-empty" />;
  }

  return (
    <div className="vc-alare-lyrics vc-alare-lyrics-preview" style={style}>
      <div className="vc-alare-lyrics-viewport">
        <div className="vc-alare-lyrics-track">
          <AlareLyricsTrackLines
            lines={timeline.lines}
            scrollLinePosition={activeIndex}
            blockGapPx={blockGapPx}
            lineOpacity={(lineIndex, scrollPos) =>
              alareLineOpacity(lineIndex, scrollPos, fadeEnabled, visibleLineCount / 2)
            }
          />
        </div>
      </div>
    </div>
  );
}
