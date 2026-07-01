import { useRef } from 'react';
import { formatTime } from './formatTime';
import { ScrollingNowPlaying } from './ScrollingNowPlaying';
import {
  IconNext,
  IconPause,
  IconPlay,
  IconPrevious,
  IconRepeat,
  IconRepeatOne,
  IconShuffle,
  IconVolume,
  IconVolumeMuted,
} from './PlayerIcons';

export type RepeatMode = 'off' | 'all' | 'one';

type PlayerBarProps = {
  disabled: boolean;
  isPlaying: boolean;
  nowPlayingTitle: string;
  shuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  currentTime: number;
  duration: number;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (time: number) => void;
};

/** Desktop-style transport row + now playing + volume + seekable progress bar. */
export function PlayerBar({
  disabled,
  isPlaying,
  nowPlayingTitle,
  shuffle,
  repeatMode,
  volume,
  currentTime,
  duration,
  onToggleShuffle,
  onPrevious,
  onTogglePlayPause,
  onNext,
  onCycleRepeat,
  onVolumeChange,
  onSeek,
}: PlayerBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);

  const seekFromClientX = (clientX: number) => {
    const bar = progressRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const onProgressPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    seekFromClientX(event.clientX);

    const onMove = (moveEvent: PointerEvent) => seekFromClientX(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const timeRemaining = duration > 0 ? Math.max(0, duration - currentTime) : 0;
  const repeatLabel =
    repeatMode === 'one' ? 'Repeat current song' : repeatMode === 'all' ? 'Repeat playlist' : 'Repeat off';

  return (
    <div className="player-bar">
      <div className="player-transport-controls">
        <button
          type="button"
          className={`transport-btn${shuffle ? ' active' : ''}`}
          onClick={onToggleShuffle}
          disabled={disabled}
          aria-label="Shuffle"
          aria-pressed={shuffle}
        >
          <IconShuffle />
        </button>
        <button type="button" className="transport-btn" onClick={onPrevious} disabled={disabled} aria-label="Previous">
          <IconPrevious />
        </button>
        <button
          type="button"
          className="transport-btn transport-btn-primary"
          onClick={onTogglePlayPause}
          disabled={disabled}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="transport-btn" onClick={onNext} disabled={disabled} aria-label="Next">
          <IconNext />
        </button>
        <button
          type="button"
          className={`transport-btn transport-btn-repeat${repeatMode !== 'off' ? ' active' : ''}`}
          onClick={onCycleRepeat}
          disabled={disabled}
          aria-label={repeatLabel}
          aria-pressed={repeatMode !== 'off'}
        >
          {repeatMode === 'one' ? <IconRepeatOne /> : <IconRepeat />}
        </button>
      </div>

      <ScrollingNowPlaying title={nowPlayingTitle} />

      <div className="player-volume">
        <span className="volume-icon" aria-hidden="true">
          {volume <= 0.01 ? <IconVolumeMuted /> : <IconVolume />}
        </span>
        <input
          type="range"
          className="volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label="Volume"
        />
      </div>

      <div className="player-progress">
        <span className="player-time">{formatTime(currentTime)}</span>
        <div
          ref={progressRef}
          className="progress-track"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={disabled || duration <= 0 ? -1 : 0}
          onPointerDown={onProgressPointerDown}
          onKeyDown={(event) => {
            if (disabled || duration <= 0) return;
            if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
            if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
          }}
        >
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="player-time player-time-remaining">−{formatTime(timeRemaining)}</span>
      </div>
    </div>
  );
}
