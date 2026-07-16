/**
 * Full-screen upcoming queue overlay — position and max count come from VC Settings.
 * Double-click a row to jump to that song; single click is inert; click outside closes.
 */

import type { MouseEvent } from 'react';

import type { VcUpcomingOverlaySettings, VcUpcomingSong } from '@shared/vcModeTypes';

import { formatTime } from '@shared/listener/formatTime';

import { sendVcTransport } from './useVcTransport';

type VcUpcomingOverlayProps = {
  songs: VcUpcomingSong[];
  settings: VcUpcomingOverlaySettings;
  onDismiss: () => void;
};

function rankLabel(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function VcUpcomingOverlay({ songs, settings, onDismiss }: VcUpcomingOverlayProps) {
  const position = settings.position;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    // Only the chrome around the panel dismisses — not the list itself.
    if (event.target === event.currentTarget) {
      onDismiss();
    }
  };

  const handleRowDoubleClick = (songId: number) => {
    sendVcTransport({ type: 'playSong', songId });
    onDismiss();
  };

  return (
    <div
      className={`vc-overlay vc-overlay-upcoming vc-overlay-upcoming--${position}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="vc-upcoming-panel"
        role="dialog"
        aria-label="Upcoming songs"
        onClick={(event) => event.stopPropagation()}
      >
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
              <li
                key={`${entry.id}-${index}`}
                className="vc-upcoming-row"
                onDoubleClick={() => handleRowDoubleClick(entry.id)}
                title="Double-click to play"
              >
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
                      draggable={false}
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
