import { useMemo, useState, type CSSProperties } from 'react';

import type { EffectiveUpcomingCoversPresentation } from '@shared/vcMode/assignmentSettings';
import type { VcUpcomingSong } from '@shared/vcModeTypes';

import { sendVcTransport } from './useVcTransport';

const MIN_COVER_PX = 120;
const COVER_GAP_PX = 20;

type VcUpcomingCoversViewProps = {
  songs: VcUpcomingSong[];
  presentation: EffectiveUpcomingCoversPresentation;
};

function CoverTile({
  song,
  onSingleClick,
  onDoubleClick,
}: {
  song: VcUpcomingSong;
  onSingleClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <button
      type="button"
      className="vc-upcoming-cover-tile"
      onClick={onSingleClick}
      onDoubleClick={(event) => {
        event.preventDefault();
        onDoubleClick();
      }}
    >
      {song.coverUrl ? (
        <img className="vc-upcoming-cover-img" src={song.coverUrl} alt="" />
      ) : (
        <div className="vc-upcoming-cover-placeholder" aria-hidden="true" />
      )}
      <span className="vc-upcoming-cover-title">{song.title}</span>
    </button>
  );
}

/** Upcoming playlist covers — gallery (multi-row) or overflow (single horizontal row). */
export function VcUpcomingCoversView({ songs, presentation }: VcUpcomingCoversViewProps) {
  const [enlargedId, setEnlargedId] = useState<number | null>(null);
  const enlarged = songs.find((song) => song.id === enlargedId) ?? null;

  const layoutClass =
    presentation.layout === 'gallery' ? 'vc-upcoming-gallery' : 'vc-upcoming-overflow';

  const gridStyle = useMemo((): CSSProperties | undefined => {
    if (presentation.layout !== 'gallery') return undefined;
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_COVER_PX}px, 1fr))`,
      gap: `${COVER_GAP_PX}px`,
    };
  }, [presentation.layout]);

  if (!songs.length) return <div className="vc-cell-empty" />;

  return (
    <>
      <div className={`vc-upcoming-covers ${layoutClass}`} style={gridStyle}>
        {songs.map((song) => (
          <CoverTile
            key={song.id}
            song={song}
            onSingleClick={() => setEnlargedId(song.id)}
            onDoubleClick={() => {
              setEnlargedId(null);
              sendVcTransport({ type: 'playSong', songId: song.id });
            }}
          />
        ))}
      </div>

      {enlarged ? (
        <div
          className="vc-upcoming-enlarge-backdrop"
          role="presentation"
          onClick={() => setEnlargedId(null)}
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
