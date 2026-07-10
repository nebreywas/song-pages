import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  VC_SURFACE_DESIGN_MIN_COUNT,
  VC_SURFACE_DESIGN_NAME_MAX_LEN,
  type VcSurfaceDesign,
} from '@shared/vcSurfaceDesigns';

type SurfaceDesignsPopoverProps = {
  designs: VcSurfaceDesign[];
  activeDesignId: string;
  onSelect: (designId: string) => void;
  onCreate: () => void;
  onRename: (designId: string, name: string) => void;
  onDelete: (design: VcSurfaceDesign) => void;
};

const POPOVER_WIDTH_PX = 300;
const POPOVER_GAP_PX = 6;
const VIEWPORT_PAD_PX = 8;

/** Surface tab toolbar — list, create, rename, and delete saved surface designs. */
export function SurfaceDesignsPopover({
  designs,
  activeDesignId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: SurfaceDesignsPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const activeDesign = designs.find((design) => design.id === activeDesignId);

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

    const estimatedHeight = popoverRef.current?.offsetHeight ?? 280;
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_PAD_PX) {
      top = rect.top - POPOVER_GAP_PX - estimatedHeight;
    }
    top = Math.max(VIEWPORT_PAD_PX, top);

    setStyle({ top, left, width: POPOVER_WIDTH_PX });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditingId(null);
    setDraftName('');
  }, []);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      if (next) reposition();
      if (!next) {
        setEditingId(null);
        setDraftName('');
      }
      return next;
    });
  };

  const startRename = (design: VcSurfaceDesign) => {
    setEditingId(design.id);
    setDraftName(design.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    if (trimmed) onRename(editingId, trimmed);
    setEditingId(null);
    setDraftName('');
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
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
    };
  }, [close, open, reposition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn vc-surface-designs-trigger"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={toggle}
      >
        Surfaces
        {activeDesign ? <span className="vc-surface-designs-trigger-name">{activeDesign.name}</span> : null}
      </button>
      {open
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              className="vc-surface-designs-popover"
              role="dialog"
              aria-label="Surface designs"
              style={style}
            >
              <div className="vc-surface-designs-popover-header">
                <h3>Surface designs</h3>
                <button type="button" className="btn" onClick={onCreate}>
                  + New
                </button>
              </div>
              <ul className="vc-surface-designs-list" role="listbox" aria-label="Saved surface designs">
                {designs.map((design) => {
                  const isActive = design.id === activeDesignId;
                  const isEditing = editingId === design.id;
                  const canDelete = designs.length > VC_SURFACE_DESIGN_MIN_COUNT;
                  return (
                    <li
                      key={design.id}
                      className={`vc-surface-designs-item${isActive ? ' is-active' : ''}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          className="vc-surface-designs-rename-input"
                          value={draftName}
                          maxLength={VC_SURFACE_DESIGN_NAME_MAX_LEN}
                          autoFocus
                          aria-label={`Rename ${design.name}`}
                          onChange={(event) => setDraftName(event.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitRename();
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              setEditingId(null);
                              setDraftName('');
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="vc-surface-designs-select"
                          onClick={() => {
                            onSelect(design.id);
                            close();
                          }}
                        >
                          {design.name}
                        </button>
                      )}
                      <div className="vc-surface-designs-item-actions">
                        <button
                          type="button"
                          className="vc-surface-designs-action"
                          aria-label={`Rename ${design.name}`}
                          onClick={() => startRename(design)}
                        >
                          Rename
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            className="vc-surface-designs-action vc-surface-designs-action--danger"
                            aria-label={`Delete ${design.name}`}
                            onClick={() => {
                              onDelete(design);
                              close();
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
