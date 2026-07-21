import { useCallback, useRef, useState } from 'react';

import { formatPlaybackTime } from '@shared/formatPlaybackTime';
import type { EffectiveSeekBarPresentation } from '@shared/vcMode/assignmentSettings';
import type { VcPlaybackState } from '@shared/vcModeTypes';

import { sendVcTransport } from './useVcTransport';

type VcTransportBarProps = {
  playback: VcPlaybackState;
  presentation: EffectiveSeekBarPresentation;
  /** When true, show prev / play-pause / next above the seek row. */
  showTransport: boolean;
  /** Scale the control palette (100–200%). */
  scalePct?: number;
};

/**
 * Shared seek row + optional transport buttons for VC player-controls and seek-bar slots.
 */
export function VcTransportBar({
  playback,
  presentation,
  showTransport,
  scalePct = 100,
}: VcTransportBarProps) {
  const scrubRef = useRef<HTMLDivElement>(null);
  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;
  const scale = scalePct / 100;
  // Right-hand time can show either "−remaining" (default) or total song time.
  // Click to toggle, mirroring the main listener player's time readout.
  const [endDisplay, setEndDisplay] = useState<'remaining' | 'duration'>('remaining');
  const remaining = Math.max(0, playback.duration - playback.currentTime);
  const endLabel =
    endDisplay === 'duration' ? formatPlaybackTime(playback.duration) : `−${formatPlaybackTime(remaining)}`;
  const endAriaLabel =
    endDisplay === 'duration'
      ? `Total duration ${formatPlaybackTime(playback.duration)}. Click to show time remaining.`
      : `Time remaining ${formatPlaybackTime(remaining)}. Click to show total duration.`;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      if (!presentation.clickable || playback.duration <= 0) return;
      const track = scrubRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      sendVcTransport({ type: 'seek', seconds: ratio * playback.duration });
    },
    [playback.duration, presentation.clickable],
  );

  const onScrubPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!presentation.clickable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
    const onMove = (moveEvent: PointerEvent) => seekFromClientX(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className="vc-transport-bar"
      style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: 'center center' }}
    >
      {showTransport ? (
        <div className="vc-transport-buttons">
          <button type="button" className="vc-transport-btn" aria-label="Previous" onClick={() => sendVcTransport({ type: 'prev' })}>
            ←
          </button>
          <button
            type="button"
            className="vc-transport-btn vc-transport-btn-play"
            aria-label={playback.isPlaying ? 'Pause' : 'Play'}
            onClick={() => sendVcTransport({ type: 'playPause' })}
          >
            {playback.isPlaying ? '❚❚' : '▶'}
          </button>
          <button type="button" className="vc-transport-btn" aria-label="Next" onClick={() => sendVcTransport({ type: 'next' })}>
            →
          </button>
        </div>
      ) : null}

      <div className="vc-transport-seek-row">
        <span className="vc-transport-time">{formatPlaybackTime(playback.currentTime)}</span>
        <div
          ref={scrubRef}
          className={`vc-transport-scrub${presentation.clickable ? ' is-clickable' : ''}`}
          role={presentation.clickable ? 'slider' : undefined}
          aria-valuemin={0}
          aria-valuemax={playback.duration}
          aria-valuenow={playback.currentTime}
          onPointerDown={onScrubPointerDown}
        >
          <div className="vc-transport-scrub-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button
          type="button"
          className="vc-transport-time vc-transport-time-remaining vc-transport-time-toggle"
          onClick={() => setEndDisplay((prev) => (prev === 'remaining' ? 'duration' : 'remaining'))}
          aria-label={endAriaLabel}
          title={endDisplay === 'duration' ? 'Total time — click for remaining' : 'Remaining — click for total'}
        >
          {endLabel}
        </button>
      </div>
    </div>
  );
}
