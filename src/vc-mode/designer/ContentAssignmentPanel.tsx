/**
 * Content assignment for active base areas and floats.
 * Geometry is edited on the Surface tab; this panel only attaches content.
 */

import {
  activeAreaCount,
  emptyCell,
  VC_CONTENT_LABELS,
  VC_CYCLE_OPTIONS,
  type VcCellAssignment,
  type VcCellContent,
  type VcCycleTime,
  type VcModeConfig,
} from '@shared/vcModeTypes';

type ContentAssignmentPanelProps = {
  config: VcModeConfig;
  onUpdateArea: (index: number, patch: Partial<VcCellAssignment>) => void;
  onUpdateFloat: (id: string, patch: Partial<VcCellAssignment>) => void;
};

const CONTENT_OPTIONS = Object.entries(VC_CONTENT_LABELS) as Array<[VcCellContent, string]>;

function cellNeedsCycle(cell: VcCellAssignment): boolean {
  return cell.slotA !== '' && cell.slotB !== '';
}

function AssignmentRow({
  label,
  cell,
  onChange,
}: {
  label: string;
  cell: VcCellAssignment;
  onChange: (patch: Partial<VcCellAssignment>) => void;
}) {
  return (
    <div className="vc-area-row">
      <span className="vc-area-label">{label}</span>
      <select
        value={cell.slotA}
        onChange={(e) => onChange({ slotA: e.target.value as VcCellContent })}
      >
        {CONTENT_OPTIONS.map(([value, optionLabel]) => (
          <option key={value || 'blank'} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
      <select
        value={cell.slotB}
        onChange={(e) => onChange({ slotB: e.target.value as VcCellContent })}
      >
        {CONTENT_OPTIONS.map(([value, optionLabel]) => (
          <option key={`b-${value || 'blank'}`} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
      <select
        value={cell.cycleTime ?? ''}
        disabled={!cellNeedsCycle(cell)}
        onChange={(e) =>
          onChange({
            cycleTime: e.target.value
              ? e.target.value === 'click'
                ? 'click'
                : (Number(e.target.value) as VcCycleTime)
              : null,
          })
        }
      >
        <option value="">Cycle…</option>
        {VC_CYCLE_OPTIONS.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ContentAssignmentPanel({
  config,
  onUpdateArea,
  onUpdateFloat,
}: ContentAssignmentPanelProps) {
  const areaCount = activeAreaCount(config);

  return (
    <div className="vc-content-panel">
      <section className="vc-area-rows">
        <h3>Base areas</h3>
        {Array.from({ length: areaCount }, (_, index) => {
          const cell = config.cells[index] ?? emptyCell();
          return (
            <AssignmentRow
              key={`area-${index}`}
              label={`Area ${index + 1}`}
              cell={cell}
              onChange={(patch) => onUpdateArea(index, patch)}
            />
          );
        })}
      </section>

      {config.surface.floats.length > 0 ? (
        <section className="vc-area-rows">
          <h3>Floats</h3>
          {config.surface.floats.map((float, index) => {
            const cell = config.floatContent[float.id] ?? emptyCell();
            return (
              <AssignmentRow
                key={float.id}
                label={`Float ${index + 1}`}
                cell={cell}
                onChange={(patch) => onUpdateFloat(float.id, patch)}
              />
            );
          })}
        </section>
      ) : (
        <p className="vc-content-hint">No floats yet. Add them on the Surface tab.</p>
      )}
    </div>
  );
}
