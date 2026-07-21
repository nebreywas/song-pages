import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PlayerZenIndicatorProps = {
  onRemove: () => void;
};

/**
 * Off-white "zen" bug beside Now Playing (bullet-separated in the label row).
 *
 * The popover uses a portal because the player title row clips overflowing
 * marquee text; rendering under document.body keeps the explanation visible.
 */
export function PlayerZenIndicator({ onRemove }: PlayerZenIndicatorProps) {
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
  }, [open]);

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

  const remove = () => {
    onRemove();
    setOpen(false);
  };

  const popover =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className="player-zen-popover panel"
            style={popoverStyle}
            role="dialog"
            aria-label="About Zen mode"
          >
            <div className="player-zen-popover-header">
              <p className="player-zen-popover-label">Zen mode</p>
              <button
                type="button"
                className="player-on-deck-popover-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="player-zen-popover-copy">
              Zen mode introduces brief interludes of silence every few songs.
            </p>
            <div className="player-on-deck-popover-footer">
              <button type="button" className="player-on-deck-remove" onClick={remove}>
                Remove
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="player-now-playing-zen-suffix">
      <button
        ref={triggerRef}
        type="button"
        className={`player-now-playing-zen-link${open ? ' active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="About Zen mode"
      >
        zen
      </button>
      {popover}
    </span>
  );
}
