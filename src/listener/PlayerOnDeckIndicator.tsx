import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PlayerOnDeckInfo = {
  songTitle: string;
  artistName: string;
  playlistName: string;
};

type PlayerOnDeckTitleSuffixProps = {
  onDeck: PlayerOnDeckInfo;
  onCancel: () => void;
};

/** Inline "on deck" label beside the now-playing title — opens a summary popover below. */
export function PlayerOnDeckTitleSuffix({ onDeck, onCancel }: PlayerOnDeckTitleSuffixProps) {
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
              <p className="player-on-deck-popover-label">On deck</p>
              <button
                type="button"
                className="player-on-deck-popover-close"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="player-on-deck-popover-title">{onDeck.songTitle}</p>
            <p className="player-on-deck-popover-meta">
              {onDeck.artistName.trim() ? `${onDeck.artistName} · ` : null}
              {onDeck.playlistName}
            </p>
            <p className="player-on-deck-popover-hint">
              Plays after this track. Next jumps to it; Previous clears it.
            </p>
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
