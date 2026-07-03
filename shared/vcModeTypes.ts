/** VC Mode — listening party visual mixer types (shared main ↔ VC window). */

import { VC_MAX_BASE_AREAS, VC_SAFE_TEMPLATE_ID } from './vcSurface/constants';
import { sanitizeFloats, type VcFloatGeometry } from './vcSurface/floats';
import { resolveDividers } from './vcSurface/geometry';
import {
  defaultDividersForTemplate,
  getTemplate,
  isVcTemplateId,
  type VcTemplateId,
} from './vcSurface/templates';

export type { VcTemplateId } from './vcSurface/templates';
export type { VcFloatGeometry } from './vcSurface/floats';
export type { VcAreaRect, VcDividerHandle, VcRect, VcSurfaceLayout } from './vcSurface/geometry';

export type VcCellContent = '' | 'visualizer' | 'cover' | 'lyrics' | 'about' | 'artist' | 'host';

export type VcCycleTime = 'click' | 10 | 15 | 20 | 30 | 45 | 60;

export type VcCellAssignment = {
  slotA: VcCellContent;
  slotB: VcCellContent;
  /** Required when both slots are set; null when blank or single slot only. */
  cycleTime: VcCycleTime | null;
};

/** Base template geometry + floats. Content is stored separately. */
export type VcSurfaceConfig = {
  templateId: VcTemplateId;
  /** Divider positions as normalized 0–1 values, keyed by template divider name. */
  dividers: Record<string, number>;
  floats: VcFloatGeometry[];
};

/**
 * Full VC design: surface geometry, content assignments, and shared assets.
 * Base area content is indexed 0 = Area 1 … always length VC_MAX_BASE_AREAS so
 * dormant assignments survive template switches to fewer areas.
 */
export type VcModeConfig = {
  surface: VcSurfaceConfig;
  /** Content for Areas 1–4 (index 0 = Area 1). Inactive slots are dormant, not deleted. */
  cells: VcCellAssignment[];
  /** Content for floats, keyed by float id. */
  floatContent: Record<string, VcCellAssignment>;
  visualizerId: string;
  hostGraphicPath: string | null;
};

export type VcPlaybackState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

export type VcSongPayload = {
  id: number;
  title: string;
  artist: string;
  year: string | null;
  caption: string | null;
  coverUrl: string | null;
  about: string;
  lyrics: string;
  artistId: number;
};

export type VcUpcomingSong = {
  id: number;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

export type VcOverlayId = 'cover' | 'host' | 'next' | 'songInfo' | 'upcoming' | 'remaining';

export type VcStatePayload = {
  config: VcModeConfig;
  playback: VcPlaybackState;
  currentSong: VcSongPayload | null;
  nextSong: { title: string; artist: string } | null;
  upcoming: VcUpcomingSong[];
  hostGraphicUrl: string | null;
  artistName: string | null;
  artistBio: string | null;
  artistPhotoUrl: string | null;
};

export type VcHotkeyAction =
  | 'cover'
  | 'host'
  | 'next'
  | 'praise'
  | 'remaining'
  | 'songInfo'
  | 'upcoming'
  | 'debugOutlines';

export const VC_SETTINGS_KEY = 'vc.lastConfig';

export const VC_CONTENT_LABELS: Record<VcCellContent, string> = {
  '': '(blank)',
  visualizer: 'Visualizer',
  cover: 'Cover',
  lyrics: 'Lyrics',
  about: 'About song',
  artist: 'Artist',
  host: 'VC Host graphic',
};

export const VC_CYCLE_OPTIONS: Array<{ value: VcCycleTime; label: string }> = [
  { value: 'click', label: 'Click' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 20, label: '20 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
];

export function emptyCell(): VcCellAssignment {
  return { slotA: '', slotB: '', cycleTime: null };
}

export function defaultCells(): VcCellAssignment[] {
  return Array.from({ length: VC_MAX_BASE_AREAS }, () => emptyCell());
}

export function createDefaultSurface(templateId: VcTemplateId = 'quad'): VcSurfaceConfig {
  return {
    templateId,
    dividers: defaultDividersForTemplate(templateId),
    floats: [],
  };
}

export function activeAreaCount(config: VcModeConfig): number {
  return getTemplate(config.surface.templateId).areaCount;
}

/** Active base-area assignments only (for rendering). */
export function activeCells(config: VcModeConfig): VcCellAssignment[] {
  const count = activeAreaCount(config);
  return config.cells.slice(0, count);
}

/** All content-bearing regions: active base areas + floats (for validation / visualizer). */
export function allContentAssignments(config: VcModeConfig): VcCellAssignment[] {
  const floats = config.surface.floats.map(
    (f) => config.floatContent[f.id] ?? emptyCell(),
  );
  return [...activeCells(config), ...floats];
}

export function configUsesVisualizer(config: VcModeConfig): boolean {
  return allContentAssignments(config).some(
    (cell) => cell.slotA === 'visualizer' || cell.slotB === 'visualizer',
  );
}

export function configUsesHost(config: VcModeConfig): boolean {
  return allContentAssignments(config).some(
    (cell) => cell.slotA === 'host' || cell.slotB === 'host',
  );
}

function sanitizeCell(raw: unknown): VcCellAssignment {
  if (!raw || typeof raw !== 'object') return emptyCell();
  const cell = raw as Partial<VcCellAssignment>;
  const slotA = (cell.slotA ?? '') as VcCellContent;
  const slotB = (cell.slotB ?? '') as VcCellContent;
  const cycleTime = cell.cycleTime ?? null;
  return { slotA, slotB, cycleTime };
}

function sanitizeCells(raw: unknown): VcCellAssignment[] {
  const cells = Array.isArray(raw) ? raw.map(sanitizeCell) : defaultCells();
  while (cells.length < VC_MAX_BASE_AREAS) cells.push(emptyCell());
  return cells.slice(0, VC_MAX_BASE_AREAS);
}

function sanitizeFloatContent(
  raw: unknown,
  floats: VcFloatGeometry[],
): Record<string, VcCellAssignment> {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result: Record<string, VcCellAssignment> = {};
  for (const float of floats) {
    result[float.id] = sanitizeCell(source[float.id]);
  }
  // Preserve dormant float content for ids not currently present (cheap restore if re-added).
  for (const [id, value] of Object.entries(source)) {
    if (!result[id]) result[id] = sanitizeCell(value);
  }
  return result;
}

export function normalizeVcConfig(config: VcModeConfig): VcModeConfig {
  const templateId = isVcTemplateId(config.surface?.templateId)
    ? config.surface.templateId
    : VC_SAFE_TEMPLATE_ID;
  const floats = sanitizeFloats(config.surface?.floats);
  const dividers = resolveDividers(templateId, config.surface?.dividers);
  const cells = sanitizeCells(config.cells);
  const floatContent = sanitizeFloatContent(config.floatContent, floats);

  return {
    surface: { templateId, dividers, floats },
    cells,
    floatContent,
    visualizerId: config.visualizerId,
    hostGraphicPath: config.hostGraphicPath ?? null,
  };
}

/** Only one region (base or float) may use the visualizer content type. */
export function assignVisualizerToRegion(
  config: VcModeConfig,
  target: { kind: 'area'; index: number } | { kind: 'float'; id: string },
  slot: 'slotA' | 'slotB',
): VcModeConfig {
  const cells = config.cells.map((cell, index) => {
    const next = { ...cell };
    const isTarget = target.kind === 'area' && target.index === index;
    if (!isTarget) {
      if (next.slotA === 'visualizer') next.slotA = '';
      if (next.slotB === 'visualizer') next.slotB = '';
    }
    return next;
  });

  const floatContent: Record<string, VcCellAssignment> = {};
  for (const [id, cell] of Object.entries(config.floatContent)) {
    const next = { ...cell };
    const isTarget = target.kind === 'float' && target.id === id;
    if (!isTarget) {
      if (next.slotA === 'visualizer') next.slotA = '';
      if (next.slotB === 'visualizer') next.slotB = '';
    }
    floatContent[id] = next;
  }

  if (target.kind === 'area') {
    const cell = { ...cells[target.index] };
    cell[slot] = 'visualizer';
    cells[target.index] = cell;
  } else {
    const cell = { ...(floatContent[target.id] ?? emptyCell()) };
    cell[slot] = 'visualizer';
    floatContent[target.id] = cell;
  }

  return { ...config, cells, floatContent };
}

/** @deprecated Use assignVisualizerToRegion — kept for migration-era call sites. */
export function assignVisualizerToCell(
  cells: VcCellAssignment[],
  cellIndex: number,
  slot: 'slotA' | 'slotB',
): VcCellAssignment[] {
  return cells.map((cell, index) => {
    const next = { ...cell };
    if (index !== cellIndex) {
      if (next.slotA === 'visualizer') next.slotA = '';
      if (next.slotB === 'visualizer') next.slotB = '';
    }
    return next;
  });
}

export function resolveCellCycleTime(cell: VcCellAssignment): VcCycleTime | null {
  const hasA = cell.slotA !== '';
  const hasB = cell.slotB !== '';
  if (!hasA && !hasB) return null;
  if (hasA !== hasB) return null;
  return cell.cycleTime;
}

/** Switch template while preserving area content by number and leaving floats alone. */
export function switchTemplate(config: VcModeConfig, templateId: VcTemplateId): VcModeConfig {
  const previousDefaults = defaultDividersForTemplate(config.surface.templateId);
  const nextDefaults = defaultDividersForTemplate(templateId);
  // Carry over divider values only when the key exists in both templates.
  const dividers: Record<string, number> = { ...nextDefaults };
  for (const [key, value] of Object.entries(config.surface.dividers)) {
    if (key in nextDefaults && key in previousDefaults) {
      dividers[key] = value;
    }
  }

  return normalizeVcConfig({
    ...config,
    surface: {
      ...config.surface,
      templateId,
      dividers: resolveDividers(templateId, dividers),
    },
  });
}

export function resetTemplateProportions(config: VcModeConfig): VcModeConfig {
  return normalizeVcConfig({
    ...config,
    surface: {
      ...config.surface,
      dividers: defaultDividersForTemplate(config.surface.templateId),
    },
  });
}
