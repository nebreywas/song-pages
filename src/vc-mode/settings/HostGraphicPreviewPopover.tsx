/**
 * Small preview trigger for host graphics — opens a compact popover beside the settings dropdown.
 */

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { findHostContentItem, type HostContentCatalog } from '@shared/hostContent';

import { HostGraphicPreviewBox } from '../designer/HostGraphicPreviewBox';

type HostGraphicPreviewPopoverProps = {
  itemId: string | null;
  catalog: HostContentCatalog;
};

const POPOVER_WIDTH_PX = 176;
const POPOVER_GAP_PX = 6;
const VIEWPORT_PAD_PX = 8;

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M6.5 16.5 10 12.5l2.5 2.5 2.5-3 3.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HostGraphicPreviewPopover({ itemId, catalog }: HostGraphicPreviewPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  const item = itemId ? findHostContentItem(catalog, itemId) : null;
  const graphicName = item?.type === 'graphic' ? item.name : null;
  const disabled = !itemId || item?.type !== 'graphic';

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + POPOVER_GAP_PX;

    if (left + POPOVER_WIDTH_PX > window.innerWidth - VIEWPORT_PAD_PX) {
      left = window.innerWidth - VIEWPORT_PAD_PX - POPOVER_WIDTH_PX;
    }
    left = Math.max(VIEWPORT_PAD_PX, left);

    const estimatedHeight = 140;
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_PAD_PX) {
      top = rect.top - POPOVER_GAP_PX - estimatedHeight;
    }

    setStyle({ top, left, width: POPOVER_WIDTH_PX });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (disabled) return;
    setOpen((current) => {
      const next = !current;
      if (next) reposition();
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const onLayoutChange = () => reposition();
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
    };
  }, [close, open, reposition]);

  useEffect(() => {
    if (!itemId) close();
  }, [close, itemId]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="vc-settings-preview-trigger"
        aria-label={graphicName ? `Preview ${graphicName}` : 'Preview graphic'}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <PreviewIcon />
      </button>
      {open && itemId
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              className="vc-settings-preview-popover"
              role="dialog"
              aria-label={graphicName ? `${graphicName} preview` : 'Graphic preview'}
              style={style}
            >
              {graphicName ? <p className="vc-settings-preview-popover-title">{graphicName}</p> : null}
              <HostGraphicPreviewBox
                itemId={itemId}
                catalog={catalog}
                className="vc-settings-preview-popover-frame"
                imageClassName="vc-settings-preview-popover-image"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
