import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { KUDO_ASSET_CATALOG } from '../../kudos/catalog/kudoAssetCatalog.generated';

const PICKER_GAP_PX = 6;
const VIEWPORT_PAD_PX = 8;
const PICKER_WIDTH_PX = 280;

type KudoIconPickerPopoverProps = {
  anchorRect: DOMRect;
  selectedAssetId?: string;
  onSelect: (assetId: string | null) => void;
  onClose: () => void;
};

/** Grid picker for built-in kudo icons — portals to body to escape panel overflow. */
export function KudoIconPickerPopover({
  anchorRect,
  selectedAssetId,
  onSelect,
  onClose,
}: KudoIconPickerPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const position = useCallback(() => {
    let left = anchorRect.left;
    let top = anchorRect.bottom + PICKER_GAP_PX;

    if (left + PICKER_WIDTH_PX > window.innerWidth - VIEWPORT_PAD_PX) {
      left = window.innerWidth - PICKER_WIDTH_PX - VIEWPORT_PAD_PX;
    }
    left = Math.max(VIEWPORT_PAD_PX, left);

    const estimatedHeight = panelRef.current?.offsetHeight ?? 220;
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_PAD_PX) {
      top = anchorRect.top - estimatedHeight - PICKER_GAP_PX;
    }
    top = Math.max(VIEWPORT_PAD_PX, top);

    return { left, top };
  }, [anchorRect.bottom, anchorRect.left, anchorRect.top]);

  const { left, top } = position();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={panelRef}
      className="vc-kudos-icon-picker"
      style={{ left, top, width: PICKER_WIDTH_PX }}
      role="dialog"
      aria-label="Choose icon"
    >
      <div className="vc-kudos-icon-picker-grid">
        <button
          type="button"
          className="vc-kudos-icon-picker-item vc-kudos-icon-picker-item--blank"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          aria-label="Clear icon"
          title="Clear icon"
        />
        {KUDO_ASSET_CATALOG.map((asset) => {
          const previewSrc = asset.variants['single-color'] ?? asset.variants.grays;
          const selected = asset.id === selectedAssetId;
          return (
            <button
              key={asset.id}
              type="button"
              className={`vc-kudos-icon-picker-item${selected ? ' is-selected' : ''}`}
              onClick={() => {
                onSelect(asset.id);
                onClose();
              }}
              aria-label={asset.label}
              title={asset.label}
            >
              {previewSrc ? <img src={previewSrc} alt="" draggable={false} /> : <span>{asset.label}</span>}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
