import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

type DesignerOverlayLayerProps = {
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** When false, only explicit close controls dismiss the overlay. */
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
};

/**
 * Modal overlay shell for the Surface designer.
 * Backdrop and Escape dismissal are optional — region popovers require the close button.
 */
export function DesignerOverlayLayer({
  ariaLabel,
  onClose,
  children,
  className = '',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: DesignerOverlayLayerProps) {
  const canDismissRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    canDismissRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      canDismissRef.current = true;
    });
    return () => window.cancelAnimationFrame(frameId);
  });

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeOnEscape]);

  return (
    <div
      className="vc-designer-overlay-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (!closeOnBackdropClick) return;
        if (event.button !== 0) return;
        if (!canDismissRef.current) return;
        if (event.target !== event.currentTarget) return;
        onCloseRef.current();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className={`vc-designer-overlay-panel panel ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}
