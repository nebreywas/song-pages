import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import './helpTooltip.css';

type HelpTooltipProps = {
  /** Accessible name for the ? trigger. */
  ariaLabel: string;
  children: React.ReactNode;
};

const TOOLTIP_MAX_WIDTH_PX = 288;
const TOOLTIP_GAP_PX = 7;
const VIEWPORT_PAD_PX = 8;

/** ? help icon — tooltip portals to body so it clears overflow/stacking in nested panels. */
export function HelpTooltip({ ariaLabel, children }: HelpTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    let left = rect.right + TOOLTIP_GAP_PX;
    const top = rect.top + rect.height / 2;

    if (left + TOOLTIP_MAX_WIDTH_PX > window.innerWidth - VIEWPORT_PAD_PX) {
      left = rect.left - TOOLTIP_GAP_PX - TOOLTIP_MAX_WIDTH_PX;
    }

    setStyle({
      top,
      left: Math.max(VIEWPORT_PAD_PX, left),
      transform: 'translateY(-50%)',
    });
  }, []);

  const show = () => {
    reposition();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const onLayoutChange = () => reposition();
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);
    return () => {
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
    };
  }, [open, reposition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="help-tooltip"
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        ?
      </button>
      {open
        ? createPortal(
            <span id={tooltipId} className="help-tooltip-popover" role="tooltip" style={style}>
              {children}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
