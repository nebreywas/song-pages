import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

type DesignerOverlayLayerProps = {
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Modal overlay shell for the Surface designer.
 * Dismisses on backdrop primary-click or Escape — never uses document capture listeners.
 */
export function DesignerOverlayLayer({
  ariaLabel,
  onClose,
  children,
  className = '',
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className="vc-designer-overlay-backdrop"
      role="presentation"
      onPointerDown={(event) => {
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
