import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  assignVisualizerToCell,
  cellCountForGrid,
  defaultCellsForGrid,
  normalizeVcConfig,
  VC_CONTENT_LABELS,
  VC_CYCLE_OPTIONS,
  type VcCellAssignment,
  type VcCellContent,
  type VcCycleTime,
  type VcGridStyle,
  type VcModeConfig,
} from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { listVisualizers, visualizerSupportsSurface } from '../visualizers/registry';
import { createDefaultVcConfig, migrateVcConfig, VC_SETTINGS_KEY } from './vcModeDefaults';

type VcModeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: (config: VcModeConfig) => void;
};

const GRID_OPTIONS: Array<{ value: VcGridStyle; label: string }> = [
  { value: 'full', label: 'Full (one area)' },
  { value: 'quarters', label: 'Quarters (2×2)' },
  { value: 'halves-vertical', label: 'Halves vertical' },
  { value: 'main-plus-2', label: 'Main + 2 (15% / 70% / 15%)' },
];

const CONTENT_OPTIONS = Object.entries(VC_CONTENT_LABELS) as Array<[VcCellContent, string]>;

function cellNeedsCycle(cell: VcCellAssignment): boolean {
  return cell.slotA !== '' && cell.slotB !== '';
}

function validateConfig(config: VcModeConfig): string | null {
  const normalized = normalizeVcConfig(config);
  let visualizerCount = 0;

  for (const cell of normalized.cells) {
    if (cell.slotA === 'visualizer') visualizerCount += 1;
    if (cell.slotB === 'visualizer') visualizerCount += 1;
    if (cellNeedsCycle(cell) && !cell.cycleTime) {
      return 'Each area with two content types needs a cycle time.';
    }
  }

  if (visualizerCount > 1) {
    return 'Only one area can use the visualizer.';
  }

  const usesHost = normalized.cells.some((c) => c.slotA === 'host' || c.slotB === 'host');
  if (usesHost && !normalized.hostGraphicPath) {
    return 'Pick a VC host graphic when assigning the host to an area.';
  }

  return null;
}

/** Configure grid layout and cell assignments before launching VC Mode. */
export function VcModeModal({ open, onClose, onStart }: VcModeModalProps) {
  const [config, setConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const app = getApp();
    if (!app?.getSettings) return;
    void app.getSettings(VC_SETTINGS_KEY).then((saved) => {
      setConfig(migrateVcConfig(saved));
      setError(null);
    });
  }, [open]);

  const visualizerAssigned = useMemo(
    () => config.cells.some((cell) => cell.slotA === 'visualizer' || cell.slotB === 'visualizer'),
    [config.cells],
  );

  const windowVisualizers = useMemo(
    () => listVisualizers().filter((p) => visualizerSupportsSurface(p, 'window') || visualizerSupportsSurface(p, 'both')),
    [],
  );

  const setGridStyle = (gridStyle: VcGridStyle) => {
    setConfig((prev) => ({
      ...prev,
      gridStyle,
      cells: defaultCellsForGrid(gridStyle).map((cell, index) => prev.cells[index] ?? cell),
    }));
  };

  const updateCell = (index: number, patch: Partial<VcCellAssignment>) => {
    setConfig((prev) => {
      let cells = prev.cells.map((cell, i) => (i === index ? { ...cell, ...patch } : cell));
      const updated = cells[index];
      if (updated && (patch.slotA === 'visualizer' || patch.slotB === 'visualizer')) {
        cells = assignVisualizerToCell(cells, index, patch.slotA === 'visualizer' ? 'slotA' : 'slotB');
      }
      if (updated && !cellNeedsCycle({ ...updated, ...patch })) {
        cells[index] = { ...cells[index], cycleTime: null };
      }
      return { ...prev, cells };
    });
  };

  const pickHostGraphic = async () => {
    const app = getApp();
    const path = await app?.openFile?.({
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    });
    if (path) setConfig((prev) => ({ ...prev, hostGraphicPath: path }));
  };

  const handleStart = () => {
    const normalized = normalizeVcConfig(config);
    const validationError = validateConfig(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }
    void getApp()?.saveSettings?.(VC_SETTINGS_KEY, normalized);
    onStart(normalized);
  };

  const handleBackdrop = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const areaCount = cellCountForGrid(config.gridStyle);

  return (
    <div className="vc-modal-backdrop" role="presentation" onClick={handleBackdrop}>
      <div className="vc-modal panel" role="dialog" aria-modal="true" aria-labelledby="vc-modal-title" onClick={(e) => e.stopPropagation()}>
        <header className="vc-modal-header">
          <h2 id="vc-modal-title">VC Mode</h2>
          <p className="vc-modal-lead">Configure your listening-party visual mixer, then launch the VC window for screen share.</p>
        </header>

        <label className="vc-field">
          <span>Grid style</span>
          <select value={config.gridStyle} onChange={(e) => setGridStyle(e.target.value as VcGridStyle)}>
            {GRID_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {visualizerAssigned ? (
          <label className="vc-field">
            <span>Visualizer plugin</span>
            <select
              value={config.visualizerId}
              onChange={(e) => setConfig((prev) => ({ ...prev, visualizerId: e.target.value }))}
            >
              {windowVisualizers.map((plugin) => (
                <option key={plugin.id} value={plugin.id}>
                  {plugin.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="vc-field">
          <span>VC host graphic (PNG/JPG)</span>
          <div className="vc-host-picker">
            <button type="button" className="btn" onClick={() => void pickHostGraphic()}>
              Choose image…
            </button>
            {config.hostGraphicPath ? <code className="vc-host-path">{config.hostGraphicPath}</code> : null}
          </div>
        </div>

        <div className="vc-area-rows">
          <h3>Area assignments</h3>
          {Array.from({ length: areaCount }, (_, index) => {
            const cell = config.cells[index] ?? { slotA: '', slotB: '', cycleTime: null };
            return (
              <div key={index} className="vc-area-row">
                <span className="vc-area-label">Area {index + 1}</span>
                <select
                  value={cell.slotA}
                  onChange={(e) => updateCell(index, { slotA: e.target.value as VcCellContent })}
                >
                  {CONTENT_OPTIONS.map(([value, label]) => (
                    <option key={value || 'blank'} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={cell.slotB}
                  onChange={(e) => updateCell(index, { slotB: e.target.value as VcCellContent })}
                >
                  {CONTENT_OPTIONS.map(([value, label]) => (
                    <option key={`b-${value || 'blank'}`} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={cell.cycleTime ?? ''}
                  disabled={!cellNeedsCycle(cell)}
                  onChange={(e) =>
                    updateCell(index, {
                      cycleTime: e.target.value ? (e.target.value === 'click' ? 'click' : Number(e.target.value)) as VcCycleTime : null,
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
          })}
        </div>

        {error ? <p className="error vc-modal-error">{error}</p> : null}

        <div className="vc-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn vc-start-btn" onClick={handleStart}>
            Start VC Mode
          </button>
        </div>
      </div>
    </div>
  );
}
