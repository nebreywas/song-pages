/**
 * One-time migration from PoC gridStyle configs to Surface/View Designer configs.
 */

import { DEFAULT_VISUALIZER_ID } from '../visualizerMessages';
import {
  createDefaultSurface,
  defaultCells,
  emptyCell,
  normalizeVcConfig,
  type VcCellAssignment,
  type VcModeConfig,
} from '../vcModeTypes';
import { sanitizeFloats } from './floats';
import { resolveDividers } from './geometry';
import { isVcTemplateId, type VcTemplateId } from './templates';

/** Legacy PoC grid styles. */
type LegacyGridStyle = 'full' | 'quarters' | 'halves-vertical' | 'halves-horizontal' | 'main-plus-2';

const LEGACY_TEMPLATE_MAP: Record<LegacyGridStyle, VcTemplateId> = {
  full: 'single-screen',
  'halves-vertical': 'double-vertical',
  'halves-horizontal': 'double-horizontal',
  quarters: 'quad',
  // Old layout was 15% / 70% / 15% horizontal bands — nearest is triple striped horizontal.
  'main-plus-2': 'triple-striped-horizontal',
};

function isLegacyGridStyle(value: unknown): value is LegacyGridStyle {
  return (
    value === 'full' ||
    value === 'quarters' ||
    value === 'halves-vertical' ||
    value === 'halves-horizontal' ||
    value === 'main-plus-2'
  );
}

function sanitizeCell(raw: unknown): VcCellAssignment {
  if (!raw || typeof raw !== 'object') return emptyCell();
  const cell = raw as Partial<VcCellAssignment>;
  return {
    slotA: (cell.slotA ?? '') as VcCellAssignment['slotA'],
    slotB: (cell.slotB ?? '') as VcCellAssignment['slotB'],
    cycleTime: cell.cycleTime ?? null,
  };
}

function migrateCells(raw: unknown): VcCellAssignment[] {
  const cells = Array.isArray(raw) ? raw.map(sanitizeCell) : defaultCells();
  while (cells.length < 4) cells.push(emptyCell());
  return cells.slice(0, 4);
}

/**
 * Map main-plus-2 stock proportions onto triple-striped-horizontal dividers.
 * Old CSS was 15fr / 70fr / 15fr → cumulative 0.15 / 0.85.
 */
function legacyDividersFor(templateId: VcTemplateId, legacyStyle: LegacyGridStyle | null): Record<string, number> {
  if (legacyStyle === 'main-plus-2' && templateId === 'triple-striped-horizontal') {
    return resolveDividers(templateId, {
      primaryHorizontal: 0.15,
      secondaryHorizontal: 0.85,
    });
  }
  return resolveDividers(templateId, undefined);
}

/** Migrate any persisted VC config (legacy or current) into a normalized VcModeConfig. */
export function migrateVcConfig(raw: unknown, visualizerIdFallback: string = DEFAULT_VISUALIZER_ID): VcModeConfig {
  if (!raw || typeof raw !== 'object') {
    return normalizeVcConfig({
      surface: createDefaultSurface('quad'),
      cells: defaultCells(),
      floatContent: {},
      visualizerId: visualizerIdFallback,
      hostGraphicPath: null,
    });
  }

  const value = raw as Record<string, unknown>;

  // Already on the new surface model.
  if (value.surface && typeof value.surface === 'object') {
    const surface = value.surface as Record<string, unknown>;
    const templateId = isVcTemplateId(surface.templateId) ? surface.templateId : 'quad';
    return normalizeVcConfig({
      surface: {
        templateId,
        dividers: (surface.dividers as Record<string, number>) ?? {},
        floats: sanitizeFloats(surface.floats),
      },
      cells: migrateCells(value.cells),
      floatContent:
        value.floatContent && typeof value.floatContent === 'object'
          ? (value.floatContent as VcModeConfig['floatContent'])
          : {},
      visualizerId: typeof value.visualizerId === 'string' ? value.visualizerId : visualizerIdFallback,
      hostGraphicPath: typeof value.hostGraphicPath === 'string' ? value.hostGraphicPath : null,
    });
  }

  // Legacy PoC: { gridStyle, cells, visualizerId, hostGraphicPath }
  const legacyStyle = isLegacyGridStyle(value.gridStyle) ? value.gridStyle : 'quarters';
  const templateId = LEGACY_TEMPLATE_MAP[legacyStyle] ?? 'quad';

  return normalizeVcConfig({
    surface: {
      templateId,
      dividers: legacyDividersFor(templateId, legacyStyle),
      floats: [],
    },
    cells: migrateCells(value.cells),
    floatContent: {},
    visualizerId: typeof value.visualizerId === 'string' ? value.visualizerId : visualizerIdFallback,
    hostGraphicPath: typeof value.hostGraphicPath === 'string' ? value.hostGraphicPath : null,
  });
}
