import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import './helpTooltip.css';

type HelpTooltipProps = {
  /** Accessible name for the ? trigger. */
  ariaLabel: string;
  children: ReactNode;
};

const TOOLTIP_MAX_WIDTH_PX = 288;
const TOOLTIP_GAP_PX = 7;
const VIEWPORT_PAD_PX = 8;

/**
 * ? help icon — tooltip portals to body so it clears overflow/stacking in nested panels.
 * Opens on hover/focus for pointers/keyboards, and toggles pinned open on tap/click for touch.
 */
export function HelpTooltip({ ariaLabel, children }: HelpTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  /** Sticky open from tap/click until dismissed — survives touch pseudo-hover/focus churn. */
  const [pinned, setPinned] = useState(false);
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

  const show = useCallback(() => {
    reposition();
    setOpen(true);
  }, [reposition]);

  const hideIfUnpinned = useCallback(() => {
    if (!pinned) setOpen(false);
  }, [pinned]);

  const dismiss = useCallback(() => {
    setPinned(false);
    setOpen(false);
  }, []);

  const togglePinned = (event: MouseEvent<HTMLButtonElement>) => {
    // Keep focus management predictable on touch (click after synthetic hover/focus).
    event.preventDefault();
    setPinned((wasPinned) => {
      const nextPinned = !wasPinned;
      if (nextPinned) {
        reposition();
        setOpen(true);
      } else {
        setOpen(false);
      }
      return nextPinned;
    });
  };

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

  // Tap outside / Escape closes a pinned (touch) tooltip.
  useEffect(() => {
    if (!open || !pinned) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      dismiss();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, pinned, dismiss]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`help-tooltip${pinned ? ' is-pinned' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hideIfUnpinned}
        onFocus={show}
        onBlur={hideIfUnpinned}
        onClick={togglePinned}
      >
        ?
      </button>
      {open
        ? createPortal(
            <span
              ref={popoverRef}
              id={tooltipId}
              className={`help-tooltip-popover${pinned ? ' is-pinned' : ''}`}
              role="tooltip"
              style={style}
            >
              {children}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
