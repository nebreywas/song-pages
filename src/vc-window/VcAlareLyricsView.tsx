import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { hostTextCssStyle } from '@shared/hostContent/typography';
import type { HostFontSizeId, HostFontStyleId } from '@shared/hostContent';
import {
  accumulateAlareSpeedNudgeLines,
  ALARE_SPEED_NUDGE_STEP,
  alareBlockGapPx,
  alareLineOpacity,
  alareLinesPerSecond,
  alareScrollOffsetPx,
  buildAlareTimeline,
  defaultAlareTargetVisibleLines,
  resolveAlareContainerFontPx,
  characteristicLineChars,
  softBreakAverageSlotUnits,
  resolveAlareScrollLinePosition,
} from '@shared/alare';
import type { AlareTimeline } from '@shared/alare';
import type { LyricEffectId } from '@shared/lyricEffects';
import { DEFAULT_VC_PRETTY_LYRICS_OPTIONS } from '@shared/prettyLyrics';
import type { VcLyricTypographyMode, VcTextAlign } from '@shared/vcMode/assignmentSettings';
import type { VcPlaybackState } from '@shared/vcModeTypes';

import { publishAlareLiveDebug } from '../live-debug/alareLiveDebugStore';
import { AlareLyricsTrackLines } from './AlareLyricsTrackLines';
import { useDomVisibleLyricLineIds } from './lyricEffects/useDomVisibleLyricLineIds';
import { useLyricEffectFrame } from './lyricEffects/useLyricEffectFrame';
import { useVcAlareSpeedNudge } from './VcAlareNudgeContext';
import { VcPrettyAlareTrack } from './VcPrettyAlareTrack';

const SCROLL_BLEND = 0.65;
const SEEK_DRIFT_SEC = 0.85;
const MAX_EXTRAPOLATE_SEC = 0.4;
const BACKWARD_JITTER_LINE = 0.02;
/** Cap Live Debug HUD updates so RAF doesn't thrash React subscribers. */
const LIVE_DEBUG_PUBLISH_MS = 250;

/**
 * Mean lyric-line slot (height + margins). Pretty/soft-break lines vary a lot —
 * sampling one short line under-scrolls so the song visually outpaces the lyrics.
 */
function measureAverageAlareLineSlotPx(container: HTMLElement): number {
  const nodes = container.querySelectorAll<HTMLElement>('.vc-alare-lyrics-line');
  if (nodes.length === 0) return 0;
  let sum = 0;
  for (const node of nodes) {
    const style = getComputedStyle(node);
    const mt = parseFloat(style.marginTop || '0') || 0;
    const mb = parseFloat(style.marginBottom || '0') || 0;
    sum += node.offsetHeight + mt + mb;
  }
  return sum / nodes.length;
}

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
  /** Agnostic presentation effect — independent of ALARE timeline. */
  lyricPresentationEffect?: LyricEffectId;
  /**
   * Pretty Lyrics typography (Sample 1). Independent of lyricPresentationEffect.
   * Uses transparent background — theme bg never painted in VC.
   */
  lyricTypographyMode?: VcLyricTypographyMode;
  /**
   * Pretty only: soft-return long/dense lines (presentation-only; same ALARE index).
   */
  prettySoftBreakLongLines?: boolean;
  /** Byte-frequency FFT from main window; used only by audio-driven effects. */
  frequencyData?: Uint8Array | null;
};

function hostTextStyle(
  fontStyle: HostFontStyleId,
  fontSize: HostFontSizeId,
  color: string,
  textAlign?: VcTextAlign,
  /** Container-fitted px — overrides Host absolute size when provided. */
  fontSizePx?: number,
): CSSProperties {
  const style = hostTextCssStyle(fontStyle, fontSize, color);
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: fontSizePx != null ? `${fontSizePx}px` : style.fontSize,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    lineHeight: style.lineHeight,
    ...(textAlign ? { textAlign } : {}),
  };
}

function averageLineCharCount(lines: Array<{ text: string }> | undefined): number {
  return characteristicLineChars(lines);
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
  lyricPresentationEffect = 'none',
  lyricTypographyMode = 'plain',
  prettySoftBreakLongLines = false,
  frequencyData = null,
}: VcAlareLyricsViewProps) {
  const alareSpeedNudge = useVcAlareSpeedNudge();
  const containerRef = useRef<HTMLDivElement>(null);
  const [geometryLines, setGeometryLines] = useState(5);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
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
  const lastLiveDebugPublishMsRef = useRef(0);
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

  const usePretty = lyricTypographyMode === 'pretty';
  const targetLines = defaultAlareTargetVisibleLines(targetVisibleLines);

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

  // Fit base type to the VC cell; Host fontSize is a bias around the fitted size.
  // Soft-breaks re-budget width from shortened rows and height from taller slots.
  const baseFontPx = useMemo(() => {
    const peakScale = usePretty
      ? DEFAULT_VC_PRETTY_LYRICS_OPTIONS.anchorMaxScale * DEFAULT_VC_PRETTY_LYRICS_OPTIONS.sizeVariance
      : 1;
    return resolveAlareContainerFontPx({
      containerWidth: viewportWidth,
      containerHeight: viewportHeight,
      fontSize,
      targetVisibleLines: targetLines,
      averageLineChars: averageLineCharCount(timeline?.lines),
      peakScale,
      softBreakLongLines: usePretty && prettySoftBreakLongLines,
      lines: timeline?.lines,
    });
  }, [
    viewportWidth,
    viewportHeight,
    fontSize,
    targetLines,
    usePretty,
    prettySoftBreakLongLines,
    timeline?.lines,
  ]);

  const lineHeightPx = baseFontPx * 1.35;
  // Soft-break pairs are taller — weigh geometry by how many lines actually split.
  const slotUnits =
    usePretty && prettySoftBreakLongLines
      ? softBreakAverageSlotUnits(timeline?.lines, true)
      : 1;
  const geometrySlotPx = lineHeightPx * slotUnits;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const height = container.clientHeight;
      const width = container.clientWidth;
      const paddingY = 24;
      const usable = Math.max(geometrySlotPx, height - paddingY);
      const fit = Math.max(1, Math.floor(usable / geometrySlotPx));
      setGeometryLines(fit);
      setViewportHeight(height);
      setViewportWidth(width);

      const sample = measureAverageAlareLineSlotPx(container);
      if (sample > 0) setSlotHeightPx(sample);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [geometrySlotPx, text, baseFontPx, usePretty, prettySoftBreakLongLines]);

  const visibleLineCount = Math.max(1, Math.min(geometryLines, targetLines));
  const visibleRadius = Math.max(1, visibleLineCount / 2);
  const pulseEffectsEnabled = lyricPresentationEffect !== 'none';
  // Pretty/variable line heights make index-based “visible” drift mid-song —
  // pulse only lines IntersectionObserver says are in the lyrics viewport.
  const domVisibleLineIds = useDomVisibleLyricLineIds(
    containerRef,
    songId,
    pulseEffectsEnabled,
  );

  const scrollTargetForWallTime = (wallTimeSec: number) => {
    if (!timeline) return { clamped: 0, raw: 0, clampedEdge: false };
    const base = resolveAlareScrollLinePosition(timeline.lines, wallTimeSec);
    const maxLine = timeline.lines.length - 1;
    const raw = base + nudgeLineOffsetRef.current;
    const clamped = Math.min(maxLine, Math.max(0, raw));
    return { clamped, raw, clampedEdge: clamped !== raw, maxLine };
  };

  const syncScrollToPlayback = (wallTimeSec: number) => {
    const pos = scrollTargetForWallTime(wallTimeSec).clamped;
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
    if (!timeline) {
      publishAlareLiveDebug(null);
      return;
    }

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

      const targetInfo = scrollTargetForWallTime(wallTime);
      const target = targetInfo.clamped;
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

      // Live Debug: report accumulate-model drift (not a fake ×(1+nudge) speed).
      if (nowMs - lastLiveDebugPublishMsRef.current >= LIVE_DEBUG_PUBLISH_MS) {
        lastLiveDebugPublishMsRef.current = nowMs;
        const baseLps = alareLinesPerSecond(timeline);
        const nudge = speedNudgeRef.current;
        publishAlareLiveDebug({
          active: true,
          songId,
          nudge,
          nudgeSteps: Math.round(nudge / ALARE_SPEED_NUDGE_STEP),
          baseLinesPerSec: baseLps,
          driftLinesPerSec: nudge * baseLps,
          nudgeLineOffset: nudgeLineOffsetRef.current,
          scrollLinePosition: next,
          maxLineIndex: Math.max(0, timeline.lines.length - 1),
          scrollClamped: targetInfo.clampedEdge,
          densityPressure: timeline.densityPressure,
          durationSource: timeline.durationSource,
          updatedAt: Date.now(),
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      publishAlareLiveDebug(null);
    };
  }, [timeline, songId]);

  // Prefer measured DOM height; fall back to soft-break-aware geometry estimate.
  const scrollSlotHeight = slotHeightPx > 0 ? slotHeightPx : geometrySlotPx;
  const blockGapPx = alareBlockGapPx(lineHeightPx);
  const scrollOffsetPx = timeline
    ? alareScrollOffsetPx(smoothScrollPosition, timeline.lines, scrollSlotHeight, blockGapPx)
    : 0;
  const trackOffset =
    viewportHeight > 0 ? viewportHeight / 2 - scrollOffsetPx - scrollSlotHeight / 2 : 0;

  const style = hostTextStyle(fontStyle, fontSize, color, textAlign, baseFontPx);

  const effectLines = useMemo(() => {
    if (!timeline || !pulseEffectsEnabled) return [];
    const useDom = domVisibleLineIds.size > 0;
    return timeline.lines
      .map((line, index) => ({
        id: line.id,
        text: line.text,
        index,
        // DOM path: equal members of the on-screen set (no index “center” bias).
        // Fallback path: keep index distance only for opacity-band filtering.
        focusDistance: useDom ? 0 : Math.abs(smoothScrollPosition - index),
      }))
      .filter((line) => (useDom ? domVisibleLineIds.has(line.id) : line.focusDistance <= visibleRadius));
  }, [
    timeline,
    smoothScrollPosition,
    pulseEffectsEnabled,
    visibleRadius,
    domVisibleLineIds,
  ]);

  const effectTick = useLyricEffectFrame({
    effectId: lyricPresentationEffect,
    frequencyData,
    isPlaying: playback.isPlaying,
    currentTimeSec: playback.currentTime,
    lines: effectLines,
    visibleRadius: Number.POSITIVE_INFINITY,
    enabled: pulseEffectsEnabled,
    resetKey: songId,
  });

  const blockStyle: CSSProperties = {
    ...style,
    ...(effectTick.block.transform ? { transform: effectTick.block.transform } : {}),
    ...(effectTick.block.letterSpacingEm != null
      ? { letterSpacing: `${effectTick.block.letterSpacingEm}em` }
      : {}),
    ...(effectTick.block.filter ? { filter: effectTick.block.filter } : {}),
    ...(effectTick.block.cssVars as CSSProperties | undefined),
  };

  if (!timeline || timeline.lines.length === 0) {
    return <div className="vc-cell-empty" />;
  }

  return (
    <div
      ref={containerRef}
      className="vc-alare-lyrics"
      data-lyric-effect={lyricPresentationEffect}
      data-lyric-typography={lyricTypographyMode}
      style={blockStyle}
    >
      <div className="vc-alare-lyrics-viewport">
        <div
          className="vc-alare-lyrics-track"
          style={{ transform: `translateY(${trackOffset}px)` }}
        >
          {usePretty ? (
            <VcPrettyAlareTrack
              lyricsText={text}
              alareLines={timeline.lines}
              scrollLinePosition={smoothScrollPosition}
              blockGapPx={blockGapPx}
              lineOpacity={(lineIndex, scrollPos) =>
                alareLineOpacity(lineIndex, scrollPos, fadeEnabled, visibleRadius)
              }
              baseFontSizePx={baseFontPx}
              fontFamily={String(style.fontFamily ?? '')}
              softBreakLongLines={prettySoftBreakLongLines}
              lineEffects={effectTick.lines}
            />
          ) : (
            <AlareLyricsTrackLines
              lines={timeline.lines}
              scrollLinePosition={smoothScrollPosition}
              blockGapPx={blockGapPx}
              lineOpacity={(lineIndex, scrollPos) =>
                alareLineOpacity(lineIndex, scrollPos, fadeEnabled, visibleRadius)
              }
              lineEffects={effectTick.lines}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Static ALARE layout preview for the Surface designer (no timing playback).
 * Also fits type to the preview cell so designer WYSIWYG matches live VC.
 */
export function VcAlareLyricsPreview({
  text,
  fontStyle = 'clean',
  fontSize = 'medium',
  color = '#e8ecf4',
  textAlign,
  fadeEnabled = true,
  targetVisibleLines = 5,
  lyricTypographyMode = 'plain',
  prettySoftBreakLongLines = false,
}: Omit<VcAlareLyricsViewProps, 'playback' | 'songId' | 'manifestDurationSeconds'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

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

  const usePretty = lyricTypographyMode === 'pretty';
  const targetLines = defaultAlareTargetVisibleLines(targetVisibleLines);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () =>
      setViewport({ width: container.clientWidth, height: container.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text, fontSize, usePretty, prettySoftBreakLongLines]);

  const baseFontPx = useMemo(() => {
    const peakScale = usePretty
      ? DEFAULT_VC_PRETTY_LYRICS_OPTIONS.anchorMaxScale * DEFAULT_VC_PRETTY_LYRICS_OPTIONS.sizeVariance
      : 1;
    return resolveAlareContainerFontPx({
      containerWidth: viewport.width,
      containerHeight: viewport.height,
      fontSize,
      targetVisibleLines: targetLines,
      averageLineChars: averageLineCharCount(timeline?.lines),
      peakScale,
      softBreakLongLines: usePretty && prettySoftBreakLongLines,
      lines: timeline?.lines,
    });
  }, [viewport, fontSize, targetLines, usePretty, prettySoftBreakLongLines, timeline?.lines]);

  const visibleLineCount = Math.max(1, Math.min(9, targetLines));
  const activeIndex = timeline ? Math.floor(timeline.lines.length / 2) : 0;
  const lineHeightPx = baseFontPx * 1.35;
  const blockGapPx = alareBlockGapPx(lineHeightPx);
  const style = hostTextStyle(fontStyle, fontSize, color, textAlign, baseFontPx);

  if (!timeline || timeline.lines.length === 0) {
    return <div className="vc-designer-preview-empty" />;
  }

  return (
    <div
      ref={containerRef}
      className="vc-alare-lyrics vc-alare-lyrics-preview"
      data-lyric-typography={lyricTypographyMode}
      style={style}
    >
      <div className="vc-alare-lyrics-viewport">
        <div className="vc-alare-lyrics-track">
          {usePretty ? (
            <VcPrettyAlareTrack
              lyricsText={text}
              alareLines={timeline.lines}
              scrollLinePosition={activeIndex}
              blockGapPx={blockGapPx}
              lineOpacity={(lineIndex, scrollPos) =>
                alareLineOpacity(lineIndex, scrollPos, fadeEnabled, visibleLineCount / 2)
              }
              baseFontSizePx={baseFontPx}
              fontFamily={String(style.fontFamily ?? '')}
              softBreakLongLines={prettySoftBreakLongLines}
            />
          ) : (
            <AlareLyricsTrackLines
              lines={timeline.lines}
              scrollLinePosition={activeIndex}
              blockGapPx={blockGapPx}
              lineOpacity={(lineIndex, scrollPos) =>
                alareLineOpacity(lineIndex, scrollPos, fadeEnabled, visibleLineCount / 2)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
