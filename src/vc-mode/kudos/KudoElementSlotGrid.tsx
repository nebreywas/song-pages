import { KUDOS_PARTICLE_ELEMENT_MAX } from '@shared/kudos';

type KudoElementSlotGridProps = {
  label: string;
  hint?: string;
  /** Compact left-aligned values (0–4). Empty slots render as blank boxes after this run. */
  filledCount: number;
  renderFilled: (index: number) => React.ReactNode;
  onActivate: (clickIndex: number, anchor: HTMLElement) => void;
  onClear?: (index: number) => void;
  canClear?: boolean;
  /** Light backing for dark built-in icon artwork. */
  iconPreview?: boolean;
};

/** Four fixed slots — click a box to set; filled values stay left-aligned. */
export function KudoElementSlotGrid({
  label,
  hint,
  filledCount,
  renderFilled,
  onActivate,
  onClear,
  canClear = false,
  iconPreview = false,
}: KudoElementSlotGridProps) {
  return (
    <div className="vc-field vc-kudos-element-slots-field">
      <span>{label}</span>
      <div
        className={`vc-kudos-element-slots${iconPreview ? ' vc-kudos-element-slots--icon-preview' : ''}`}
        role="group"
        aria-label={label}
      >
        {Array.from({ length: KUDOS_PARTICLE_ELEMENT_MAX }, (_, index) => {
          const isFilled = index < filledCount;
          return (
            <button
              key={index}
              type="button"
              className={`vc-kudos-element-slot${isFilled ? ' is-filled' : ''}`}
              onClick={(event) => onActivate(index, event.currentTarget)}
              aria-label={isFilled ? `Change slot ${index + 1}` : `Set slot ${index + 1}`}
            >
              {isFilled ? renderFilled(index) : null}
              {isFilled && canClear && onClear ? (
                <span
                  className="vc-kudos-element-slot-clear"
                  role="button"
                  tabIndex={-1}
                  aria-label={`Clear slot ${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClear(index);
                  }}
                >
                  ×
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {hint ? <span className="vc-field-hint">{hint}</span> : null}
    </div>
  );
}
