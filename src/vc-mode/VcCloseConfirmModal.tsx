import { useEffect } from 'react';

type VcCloseConfirmModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirm before ending an active VC session (VC Live button). */
export function VcCloseConfirmModal({ open, onConfirm, onCancel }: VcCloseConfirmModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="vc-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="vc-close-confirm-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vc-close-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="vc-close-confirm-title">End VC Mode?</h2>
        <p className="vc-close-confirm-lead">Are you sure you want to close VC mode?</p>
        <div className="vc-close-confirm-actions">
          <button type="button" className="btn primary" onClick={onConfirm}>
            Yes
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
