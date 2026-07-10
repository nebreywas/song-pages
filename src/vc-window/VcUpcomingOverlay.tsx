/**
 * Full-screen upcoming queue overlay — position and max count come from VC Settings.
 */

import type { VcUpcomingOverlaySettings, VcUpcomingSong } from '@shared/vcModeTypes';

import { formatTime } from '../listener/formatTime';

type VcUpcomingOverlayProps = {
  songs: VcUpcomingSong[];
  settings: VcUpcomingOverlaySettings;
};

function rankLabel(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function VcUpcomingOverlay({ songs, settings }: VcUpcomingOverlayProps) {
  const position = settings.position;

  return (
    <div className={`vc-overlay vc-overlay-upcoming vc-overlay-upcoming--${position}`}>
      <div className="vc-upcoming-panel" role="dialog" aria-label="Upcoming songs">
        <header className="vc-upcoming-panel-header">
          <div className="vc-upcoming-panel-heading">
            <p className="vc-upcoming-panel-eyebrow">Queue preview</p>
            <h2 className="vc-upcoming-panel-title">Up next</h2>
          </div>
          {songs.length ? (
            <span className="vc-upcoming-panel-count">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </span>
          ) : null}
        </header>

        {songs.length ? (
          <ol className="vc-upcoming-list" tabIndex={0} aria-label="Upcoming song list">
            {songs.map((entry, index) => (
              <li key={`${entry.id}-${index}`} className="vc-upcoming-row">
                <span className="vc-upcoming-rank" aria-hidden="true">
                  {rankLabel(index)}
                </span>
                <div className="vc-upcoming-cover-wrap">
                  {entry.coverUrl ? (
                    <img
                      className="vc-upcoming-cover"
                      src={entry.coverUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="vc-upcoming-cover vc-upcoming-cover-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="vc-upcoming-meta">
                  <p className="vc-upcoming-title">{entry.title}</p>
                  <p className="vc-upcoming-artist">{entry.artist || 'Unknown artist'}</p>
                </div>
                <span className="vc-upcoming-duration">
                  {entry.durationSeconds ? formatTime(entry.durationSeconds) : '—'}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="vc-upcoming-empty">No upcoming songs in queue.</p>
        )}
      </div>
    </div>
  );
}
