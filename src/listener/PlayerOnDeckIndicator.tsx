import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PlayerOnDeckInfo = {
  songId: number;
  /** Library sidebar / artist id that owns the queued track. */
  playlistId: number;
  songTitle: string;
  artistName: string;
  playlistName: string;
};

type PlayerOnDeckTitleSuffixProps = {
  onDeck: PlayerOnDeckInfo;
  onCancel: () => void;
  /** Jump playlist + song page to the on-deck track (same as Now Playing title click). */
  onRevealTitle?: () => void;
};

/** Inline "on deck" label beside the now-playing title — opens a summary popover below. */
export function PlayerOnDeckTitleSuffix({ onDeck, onCancel, onRevealTitle }: PlayerOnDeckTitleSuffixProps) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePopoverPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPopoverStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
      transform: 'translateX(-50%)',
      zIndex: 2000,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, onDeck.songTitle]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleRemove = () => {
    onCancel();
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleTitleActivate = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Keep focus/scroll from escaping into the Electron document (page “jumps” up).
    event.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur?.();
    onRevealTitle?.();
    setOpen(false);
  };

  const popover =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className="player-on-deck-popover panel"
            style={popoverStyle}
            role="dialog"
            aria-label="On deck song"
          >
            <div className="player-on-deck-popover-header">
              <p className="player-on-deck-popover-label">
                On deck{' '}
                <span className="player-on-deck-popover-label-hint">(plays next)</span>
              </p>
              <button
                type="button"
                className="player-on-deck-popover-close"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {onRevealTitle ? (
              <button
                type="button"
                className="player-on-deck-popover-title player-on-deck-popover-title-btn"
                onClick={handleTitleActivate}
                title="Show this song in the playlist"
              >
                {onDeck.songTitle}
              </button>
            ) : (
              <p className="player-on-deck-popover-title">{onDeck.songTitle}</p>
            )}
            <div className="player-on-deck-popover-meta">
              {onDeck.artistName.trim() ? (
                <span className="player-on-deck-popover-artist">{onDeck.artistName.trim()}</span>
              ) : null}
              <span className="player-on-deck-popover-playlist">{onDeck.playlistName}</span>
            </div>
            <div className="player-on-deck-popover-footer">
              <button type="button" className="player-on-deck-remove" onClick={handleRemove}>
                Remove
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="player-now-playing-on-deck-suffix">
      <button
        ref={triggerRef}
        type="button"
        className={`player-now-playing-on-deck-link${open ? ' active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="View song on deck"
      >
        (on deck)
      </button>
      {popover}
    </span>
  );
}
