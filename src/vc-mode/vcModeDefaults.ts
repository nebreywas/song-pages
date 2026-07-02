import {
  cellCountForGrid,
  defaultCellsForGrid,
  type VcGridStyle,
  type VcModeConfig,
  VC_SETTINGS_KEY,
} from '@shared/vcModeTypes';
import { DEFAULT_VISUALIZER_ID } from '@shared/visualizerMessages';

export function createDefaultVcConfig(gridStyle: VcGridStyle = 'quarters'): VcModeConfig {
  return {
    gridStyle,
    cells: defaultCellsForGrid(gridStyle),
    visualizerId: DEFAULT_VISUALIZER_ID,
    hostGraphicPath: null,
  };
}

export function migrateVcConfig(raw: unknown): VcModeConfig {
  if (!raw || typeof raw !== 'object') return createDefaultVcConfig();
  const value = raw as Partial<VcModeConfig>;
  const gridStyle = value.gridStyle ?? 'quarters';
  const count = cellCountForGrid(gridStyle);
  const cells = Array.isArray(value.cells)
    ? value.cells.slice(0, count).map((cell) => ({
        slotA: cell?.slotA ?? '',
        slotB: cell?.slotB ?? '',
        cycleTime: cell?.cycleTime ?? null,
      }))
    : defaultCellsForGrid(gridStyle);
  while (cells.length < count) {
    cells.push({ slotA: '', slotB: '', cycleTime: null });
  }
  return {
    gridStyle,
    cells,
    visualizerId: value.visualizerId ?? DEFAULT_VISUALIZER_ID,
    hostGraphicPath: value.hostGraphicPath ?? null,
  };
}

export { VC_SETTINGS_KEY };
