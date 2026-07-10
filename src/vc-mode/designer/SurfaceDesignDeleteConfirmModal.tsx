import { useEffect } from 'react';

type SurfaceDesignDeleteConfirmModalProps = {
  open: boolean;
  designName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Strong confirmation before permanently deleting a saved surface design. */
export function SurfaceDesignDeleteConfirmModal({
  open,
  designName,
  onConfirm,
  onCancel,
}: SurfaceDesignDeleteConfirmModalProps) {
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
        className="vc-surface-design-delete-modal panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="vc-surface-design-delete-title"
        aria-describedby="vc-surface-design-delete-lead"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="vc-surface-design-delete-title">Delete surface design?</h2>
        <p id="vc-surface-design-delete-lead" className="vc-surface-design-delete-lead">
          <strong>{designName}</strong> will be permanently removed. Area assignments, floats, and grid
          settings for this design cannot be recovered.
        </p>
        <div className="vc-surface-design-delete-actions">
          <button type="button" className="btn danger" onClick={onConfirm}>
            Delete surface
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
