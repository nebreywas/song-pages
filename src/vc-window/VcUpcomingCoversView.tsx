import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import type { EffectiveUpcomingCoversPresentation } from '@shared/vcMode/assignmentSettings';
import type { VcUpcomingSong } from '@shared/vcModeTypes';

import { sendVcTransport } from './useVcTransport';

const COVER_GAP_PX = 20;
const MIN_COVER_PX = 72;
const LABEL_LINE_PX = 18;

type VcUpcomingCoversViewProps = {
  songs: VcUpcomingSong[];
  presentation: EffectiveUpcomingCoversPresentation;
};

type LayoutMetrics = {
  coverSize: number;
  visibleCount: number;
  columns: number;
  rows: number;
  scrollDistance: number;
  animationDurationSec: number;
};

function scrollPixelsPerSecond(scroll: EffectiveUpcomingCoversPresentation['scroll']): number {
  if (scroll === 'marquee-slow' || scroll === 'bounce-slow') return 28;
  if (scroll === 'marquee-medium' || scroll === 'bounce-medium') return 48;
  return 0;
}

function isBounceScroll(scroll: EffectiveUpcomingCoversPresentation['scroll']): boolean {
  return scroll === 'bounce-slow' || scroll === 'bounce-medium';
}

function computeSingleRowLayout(
  width: number,
  height: number,
  songCount: number,
  presentation: EffectiveUpcomingCoversPresentation,
): LayoutMetrics {
  const labelRows = (presentation.showArtist ? 1 : 0) + (presentation.showTitle ? 1 : 0);
  const labelHeight = labelRows * LABEL_LINE_PX;
  const maxCoverByHeight = Math.max(MIN_COVER_PX, height - labelHeight - 8);
  let coverSize = maxCoverByHeight;

  let visibleCount = 1;
  if (width > 0) {
    visibleCount = Math.max(1, Math.floor((width + COVER_GAP_PX) / (coverSize + COVER_GAP_PX)));
    const totalWidth = visibleCount * coverSize + (visibleCount - 1) * COVER_GAP_PX;
    if (totalWidth > width && visibleCount > 1) {
      coverSize = Math.max(MIN_COVER_PX, Math.floor((width - (visibleCount - 1) * COVER_GAP_PX) / visibleCount));
    }
  }

  const trackWidth = songCount * coverSize + Math.max(0, songCount - 1) * COVER_GAP_PX;
  const scrollDistance = Math.max(0, trackWidth - width);
  const speed = scrollPixelsPerSecond(presentation.scroll);
  const animationDurationSec = speed > 0 && scrollDistance > 0 ? scrollDistance / speed : 0;

  return {
    coverSize,
    visibleCount,
    columns: visibleCount,
    rows: 1,
    scrollDistance,
    animationDurationSec,
  };
}

function computeMultiRowLayout(
  width: number,
  height: number,
  songCount: number,
  presentation: EffectiveUpcomingCoversPresentation,
): LayoutMetrics {
  const labelRows = (presentation.showArtist ? 1 : 0) + (presentation.showTitle ? 1 : 0);
  const labelHeight = labelRows * LABEL_LINE_PX;
  const cellHeight = MIN_COVER_PX + labelHeight + 8;

  let rows = Math.max(1, Math.floor((height + COVER_GAP_PX) / (cellHeight + COVER_GAP_PX)));
  let columns = Math.max(1, Math.floor((width + COVER_GAP_PX) / (MIN_COVER_PX + COVER_GAP_PX)));
  rows = Math.min(rows, songCount);
  columns = Math.min(columns, Math.max(1, Math.ceil(songCount / rows)));

  const coverByWidth = Math.max(
    MIN_COVER_PX,
    Math.floor((width - (columns - 1) * COVER_GAP_PX) / columns),
  );
  const coverByHeight = Math.max(
    MIN_COVER_PX,
    Math.floor((height - (rows - 1) * COVER_GAP_PX - rows * labelHeight) / rows),
  );
  const coverSize = Math.min(coverByWidth, coverByHeight);
  const visibleCount = rows * columns;

  const totalRows = Math.ceil(songCount / columns);
  const trackHeight = totalRows * (coverSize + labelHeight + 8) + Math.max(0, totalRows - 1) * COVER_GAP_PX;
  const scrollDistance = Math.max(0, trackHeight - height);
  const speed = scrollPixelsPerSecond(presentation.scroll);
  const animationDurationSec = speed > 0 && scrollDistance > 0 ? scrollDistance / speed : 0;

  return {
    coverSize,
    visibleCount,
    columns,
    rows,
    scrollDistance,
    animationDurationSec,
  };
}

function CoverTile({
  song,
  presentation,
  coverSize,
  onActivate,
}: {
  song: VcUpcomingSong;
  presentation: EffectiveUpcomingCoversPresentation;
  coverSize: number;
  onActivate: () => void;
}) {
  const textStyle = { color: presentation.textColor };

  return (
    <button
      type="button"
      className="vc-upcoming-cover-tile"
      style={{ width: coverSize }}
      onClick={onActivate}
      onDoubleClick={(event) => {
        event.preventDefault();
        sendVcTransport({ type: 'playSong', songId: song.id });
      }}
    >
      {presentation.showArtist && song.artist ? (
        <span className="vc-upcoming-cover-artist" style={textStyle}>
          {song.artist}
        </span>
      ) : null}
      {song.coverUrl ? (
        <img
          className="vc-upcoming-cover-img"
          src={song.coverUrl}
          alt=""
          style={{ width: coverSize, height: coverSize }}
        />
      ) : (
        <div
          className="vc-upcoming-cover-placeholder"
          aria-hidden="true"
          style={{ width: coverSize, height: coverSize }}
        />
      )}
      {presentation.showTitle ? (
        <span className="vc-upcoming-cover-title" style={textStyle}>
          {song.title}
        </span>
      ) : null}
    </button>
  );
}

/** Upcoming playlist covers — fit-to-region single row or multi-row grid with optional scroll. */
export function VcUpcomingCoversView({ songs, presentation }: VcUpcomingCoversViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [enlargedId, setEnlargedId] = useState<number | null>(null);
  const enlarged = songs.find((song) => song.id === enlargedId) ?? null;

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const dismissZoom = useCallback(() => setEnlargedId(null), []);

  useEffect(() => {
    if (!enlarged) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissZoom();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dismissZoom, enlarged]);

  const metrics = useMemo(() => {
    if (presentation.layout === 'multi-row') {
      return computeMultiRowLayout(size.width, size.height, songs.length, presentation);
    }
    return computeSingleRowLayout(size.width, size.height, songs.length, presentation);
  }, [presentation, size.height, size.width, songs.length]);

  const staticSlice = presentation.scroll === 'static';
  const visibleSongs =
    staticSlice && songs.length > metrics.visibleCount
      ? songs.slice(0, metrics.visibleCount)
      : songs;
  const shouldCenter =
    staticSlice && visibleSongs.length > 0 && visibleSongs.length < metrics.visibleCount;

  const scrollActive =
    !staticSlice && metrics.scrollDistance > 0 && presentation.scroll !== 'static';

  const trackStyle = useMemo((): CSSProperties => {
    if (!scrollActive) return {};
    const axis = presentation.layout === 'multi-row' ? 'Y' : 'X';
    const animationName = isBounceScroll(presentation.scroll)
      ? `vc-upcoming-bounce-${axis.toLowerCase()}`
      : `vc-upcoming-marquee-${axis.toLowerCase()}`;
    return {
      ['--scroll-distance' as string]: `${metrics.scrollDistance}px`,
      animationName,
      animationDuration: `${Math.max(metrics.animationDurationSec, 4)}s`,
      animationTimingFunction: isBounceScroll(presentation.scroll) ? 'ease-in-out' : 'linear',
      animationIterationCount: 'infinite',
    };
  }, [metrics.animationDurationSec, metrics.scrollDistance, presentation.layout, presentation.scroll, scrollActive]);

  const handleCoverActivate = (songId: number) => {
    if (presentation.clickToZoom) {
      setEnlargedId(songId);
      return;
    }
    sendVcTransport({ type: 'playSong', songId });
  };

  if (!songs.length) return <div className="vc-cell-empty" />;

  const layoutClass =
    presentation.layout === 'multi-row' ? 'vc-upcoming-multi-row' : 'vc-upcoming-single-row';

  return (
    <>
      <div
        ref={containerRef}
        className={`vc-upcoming-covers ${layoutClass}${shouldCenter ? ' is-centered' : ''}${
          scrollActive ? ' is-scrolling' : ''
        }`}
      >
        <div
          className={`vc-upcoming-track${presentation.layout === 'multi-row' ? ' vc-upcoming-track-grid' : ''}`}
          style={{
            ...trackStyle,
            gap: `${COVER_GAP_PX}px`,
            ...(presentation.layout === 'multi-row'
              ? { gridTemplateColumns: `repeat(${metrics.columns}, ${metrics.coverSize}px)` }
              : undefined),
          }}
        >
          {visibleSongs.map((song, index) => (
            <CoverTile
              key={`${song.id}-${index}`}
              song={song}
              presentation={presentation}
              coverSize={metrics.coverSize}
              onActivate={() => handleCoverActivate(song.id)}
            />
          ))}
        </div>
      </div>

      {enlarged && presentation.clickToZoom ? (
        <div
          className="vc-upcoming-enlarge-backdrop"
          role="presentation"
          onClick={dismissZoom}
        >
          <div
            className="vc-upcoming-enlarge-modal"
            role="dialog"
            aria-modal="true"
            aria-label={enlarged.title}
            onClick={(event) => event.stopPropagation()}
          >
            {enlarged.coverUrl ? (
              <img className="vc-upcoming-enlarge-img" src={enlarged.coverUrl} alt="" />
            ) : null}
            <p className="vc-upcoming-enlarge-title">{enlarged.title}</p>
            <p className="vc-upcoming-enlarge-artist">{enlarged.artist}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
