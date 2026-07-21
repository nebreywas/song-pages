import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PlayerRadioIndicatorProps = {
  onRemove: () => void;
};

/**
 * Red "radio" bug beside Now Playing — mirrors the Zen indicator pattern.
 *
 * Portal popover avoids the title-row overflow clip that hides marquee siblings.
 */
export function PlayerRadioIndicator({ onRemove }: PlayerRadioIndicatorProps) {
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
            className="player-radio-popover panel"
            style={popoverStyle}
            role="dialog"
            aria-label="About Radio mode"
          >
            <div className="player-radio-popover-header">
              <p className="player-radio-popover-label">Radio mode</p>
              <button
                type="button"
                className="player-on-deck-popover-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="player-radio-popover-copy">
              Radio mode inserts short spoken breaks between some songs. It works alongside Zen
              mode — when both fire, silence is split around the announcement.
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
    <span className="player-now-playing-radio-suffix">
      <button
        ref={triggerRef}
        type="button"
        className={`player-now-playing-radio-link${open ? ' active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="About Radio mode"
      >
        radio
      </button>
      {popover}
    </span>
  );
}
