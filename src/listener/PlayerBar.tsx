import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTime } from './formatTime';
import type { SeekTimeDisplay } from '@shared/listener/playerSettings';
import { ScrollingNowPlaying } from './ScrollingNowPlaying';
import { usePressHold } from '../visualizers/settings/ui/usePressHold';
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
  IconMenu,
  IconMinifyBar,
} from './PlayerIcons';

export type RepeatMode = 'off' | 'all' | 'one';

type PlayerBarProps = {
  disabled: boolean;
  isPlaying: boolean;
  nowPlayingTitle: string;
  nowPlayingArtist: string;
  nowPlayingCoverUrl: string | null;
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
  embeddedVisualizerActive?: boolean;
  canUseVisualizer?: boolean;
  onToggleEmbeddedVisualizer?: () => void;
  onOpenVisualizerSettings?: () => void;
  projectionOpen?: boolean;
  onToggleProjection?: () => void;
  onVcClick?: () => void;
  onVcLiveClick?: () => void;
  vcLive?: boolean;
  vcDisabled?: boolean;
  bassBoost?: boolean;
  lofi?: boolean;
  onToggleBassBoost?: () => void;
  onToggleLofi?: () => void;
  crossfades?: boolean;
  onToggleCrossfades?: () => void;
  seekTimeDisplay?: SeekTimeDisplay;
  onToggleSeekTimeDisplay?: () => void;
  chromeMinified?: boolean;
  onToggleChromeMinified?: () => void;
};

const MENU_IDLE_MS = 60_000;

function OptionsSeparator() {
  return (
    <span className="player-options-sep" aria-hidden="true">
      |
    </span>
  );
}

/** Desktop transport row + compact seek bar or options menu (Menu toggles between them). */
export function PlayerBar({
  disabled,
  isPlaying,
  nowPlayingTitle,
  nowPlayingArtist,
  nowPlayingCoverUrl,
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
  embeddedVisualizerActive,
  canUseVisualizer,
  onToggleEmbeddedVisualizer,
  onOpenVisualizerSettings,
  projectionOpen,
  onToggleProjection,
  onVcClick,
  onVcLiveClick,
  vcLive,
  vcDisabled,
  bassBoost = false,
  lofi = false,
  onToggleBassBoost,
  onToggleLofi,
  crossfades = false,
  onToggleCrossfades,
  seekTimeDisplay = 'remaining',
  onToggleSeekTimeDisplay,
  chromeMinified = false,
  onToggleChromeMinified,
}: PlayerBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const menuIdleTimerRef = useRef<number | null>(null);
  const preMuteVolumeRef = useRef(0.85);
  const [menuOpen, setMenuOpen] = useState(false);

  const clearMenuIdleTimer = useCallback(() => {
    if (menuIdleTimerRef.current != null) {
      window.clearTimeout(menuIdleTimerRef.current);
      menuIdleTimerRef.current = null;
    }
  }, []);

  const touchMenuActivity = useCallback(() => {
    clearMenuIdleTimer();
    menuIdleTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      menuIdleTimerRef.current = null;
    }, MENU_IDLE_MS);
  }, [clearMenuIdleTimer]);

  useEffect(() => {
    if (menuOpen) {
      touchMenuActivity();
    } else {
      clearMenuIdleTimer();
    }
    return clearMenuIdleTimer;
  }, [clearMenuIdleTimer, menuOpen, touchMenuActivity]);

  // VC launch should return to the seek bar so the live badge is visible on the right.
  useEffect(() => {
    if (vcLive) {
      setMenuOpen(false);
    }
  }, [vcLive]);

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
  const seekEndLabel =
    seekTimeDisplay === 'duration' ? formatTime(duration) : `−${formatTime(timeRemaining)}`;
  const seekEndAriaLabel =
    seekTimeDisplay === 'duration'
      ? `Total duration ${formatTime(duration)}. Click to show time remaining.`
      : `Time remaining ${formatTime(timeRemaining)}. Click to show total duration.`;
  const repeatLabel =
    repeatMode === 'one' ? 'Repeat current song' : repeatMode === 'all' ? 'Repeat playlist' : 'Repeat off';

  const visualizerDisabled = !canUseVisualizer || vcLive;
  const projectionDisabled = !canUseVisualizer || vcLive;

  const projectionActive = Boolean(projectionOpen);
  const visualizerHighlighted = Boolean(embeddedVisualizerActive);
  const projectionHighlighted = projectionActive;

  const toggleBassBoost = () => {
    touchMenuActivity();
    onToggleBassBoost?.();
  };

  const toggleLofi = () => {
    touchMenuActivity();
    onToggleLofi?.();
  };

  const handleMenuToggle = () => {
    setMenuOpen((open) => {
      if (open) {
        clearMenuIdleTimer();
      }
      return !open;
    });
  };

  const handleMenuOption = (action: () => void) => {
    touchMenuActivity();
    action();
  };

  const isMuted = volume <= 0.01;

  const handleVolumeIconClick = () => {
    if (isMuted) {
      const restore = preMuteVolumeRef.current > 0.01 ? preMuteVolumeRef.current : 0.85;
      onVolumeChange(restore);
      return;
    }
    preMuteVolumeRef.current = volume;
    onVolumeChange(0);
  };

  const handleVolumeSliderChange = (nextVolume: number) => {
    if (nextVolume > 0.01) {
      preMuteVolumeRef.current = nextVolume;
    }
    onVolumeChange(nextVolume);
  };

  const visualizerPressHold = usePressHold({
    disabled: visualizerDisabled,
    onTap: () => handleMenuOption(() => onToggleEmbeddedVisualizer?.()),
    onHold: () => handleMenuOption(() => onOpenVisualizerSettings?.()),
  });

  return (
    <div className="player-bar">
      <div className="player-transport-controls">
        <button
          type="button"
          className={`transport-btn transport-btn-shuffle${shuffle ? ' active' : ''}`}
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

      <ScrollingNowPlaying
        title={nowPlayingTitle}
        artist={nowPlayingArtist}
        coverUrl={nowPlayingCoverUrl}
      />

      <div className="player-volume">
        <button
          type="button"
          className="volume-icon-btn"
          onClick={handleVolumeIconClick}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <IconVolumeMuted /> : <IconVolume />}
        </button>
        <input
          type="range"
          className="volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => handleVolumeSliderChange(Number(event.target.value))}
          aria-label="Volume"
        />
      </div>

      <div className="player-secondary-row">
        <button
          type="button"
          className={`player-menu-btn${menuOpen ? ' active' : ''}`}
          onClick={handleMenuToggle}
          aria-pressed={menuOpen}
          aria-label={menuOpen ? 'Show seek bar' : 'Show options menu'}
          title={menuOpen ? 'Show seek bar' : 'Show options menu'}
        >
          <IconMenu />
        </button>

        <div className={`player-secondary-panel${menuOpen ? ' player-secondary-panel-menu' : ''}`}>
          {menuOpen ? (
            <nav className="player-options-bar" aria-label="Player options">
              <button
                type="button"
                className={`player-option-btn${visualizerHighlighted ? ' active' : ''}`}
                disabled={visualizerDisabled}
                {...visualizerPressHold}
                title={
                  visualizerHighlighted
                    ? 'Hide panel visualizer · hold for settings'
                    : 'Show panel visualizer · hold for settings'
                }
              >
                Visualizer
              </button>
              <OptionsSeparator />
              <button
                type="button"
                className={`player-option-btn${projectionHighlighted ? ' active' : ''}`}
                disabled={projectionDisabled}
                onClick={() => handleMenuOption(() => onToggleProjection?.())}
                title={
                  projectionActive
                    ? 'Close projection window'
                    : visualizerHighlighted
                      ? 'Open projection with visualizer'
                      : 'Open projection with song page'
                }
              >
                Projection
              </button>
              {onVcClick ? (
                <>
                  <OptionsSeparator />
                  <button
                    type="button"
                    className={`player-option-btn player-option-btn-vc${vcLive ? ' active' : ''}`}
                    disabled={vcDisabled}
                    onClick={() => handleMenuOption(() => onVcClick?.())}
                    title={vcLive ? 'End VC Mode' : 'VC Mode — listening party visual mixer'}
                  >
                    VC
                  </button>
                </>
              ) : null}
              <span className="player-options-item">
                <OptionsSeparator />
                <button
                  type="button"
                  className={`player-option-btn${bassBoost ? ' active' : ''}`}
                  onClick={toggleBassBoost}
                  disabled={!onToggleBassBoost}
                  title="Bass boost"
                >
                  Bass boost
                </button>
              </span>
              <span className="player-options-item">
                <OptionsSeparator />
                <button
                  type="button"
                  className={`player-option-btn${lofi ? ' active' : ''}`}
                  onClick={toggleLofi}
                  disabled={!onToggleLofi}
                  title="Lo-fi"
                >
                  Lo-fi
                </button>
              </span>
              <span className="player-options-item">
                <OptionsSeparator />
                <button
                  type="button"
                  className={`player-option-btn${crossfades ? ' active' : ''}`}
                  onClick={() => handleMenuOption(() => onToggleCrossfades?.())}
                  disabled={!onToggleCrossfades}
                  title="Crossfades"
                >
                  Crossfades
                </button>
              </span>
            </nav>
          ) : (
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
              <button
                type="button"
                className="player-time player-time-remaining player-time-toggle"
                onClick={onToggleSeekTimeDisplay}
                disabled={disabled || duration <= 0 || !onToggleSeekTimeDisplay}
                aria-label={seekEndAriaLabel}
                title={seekTimeDisplay === 'duration' ? 'Show time remaining' : 'Show total duration'}
              >
                {seekEndLabel}
              </button>
            </div>
          )}
        </div>

        <div className="player-secondary-trailing">
          {menuOpen ? (
            <span className="player-menu-counter" aria-live="polite">
              {formatTime(currentTime)} / {formatTime(timeRemaining)}
            </span>
          ) : null}
          <div className="player-secondary-actions">
            {!menuOpen && vcLive && onVcLiveClick ? (
              <button
                type="button"
                className="btn player-on-air-btn"
                onClick={onVcLiveClick}
                title="End VC Mode"
              >
                On Air
              </button>
            ) : null}
            {onToggleChromeMinified ? (
              <button
                type="button"
                className={`player-minify-btn${chromeMinified ? ' active' : ''}`}
                onClick={onToggleChromeMinified}
                aria-pressed={chromeMinified}
                aria-label={chromeMinified ? 'Show full Song Pages view' : 'Minify to control bar only'}
                title={chromeMinified ? 'Show full view' : 'Minify view'}
              >
                <IconMinifyBar />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
