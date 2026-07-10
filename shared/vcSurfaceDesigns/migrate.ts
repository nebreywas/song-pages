import { DEFAULT_VC_GRID_DESIGN } from '../vcMode/gridDesign';
import { normalizeVcConfig, type VcModeConfig } from '../vcModeTypes';
import { resolveDividers } from '../vcSurface/geometry';
import { defaultDividersForTemplate } from '../vcSurface/templates';
import { migrateVcConfig } from '../vcSurface/migrate';
import { DEFAULT_VISUALIZER_ID } from '../visualizerMessages';

import {
  VC_SURFACE_DESIGN_MIN_COUNT,
  VC_SURFACE_DESIGNS_VERSION,
} from './constants';
import { createSurfaceDesign, createSurfaceDesignId } from './factory';
import { normalizeSurfaceDesignName } from './names';
import type { VcSurfaceDesign, VcSurfaceDesignCatalog } from './types';

function migrateConfig(raw: unknown): VcModeConfig {
  return normalizeVcConfig(migrateVcConfig(raw, DEFAULT_VISUALIZER_ID));
}

function sanitizeDesign(raw: unknown, fallbackConfig: VcModeConfig): VcSurfaceDesign | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : createSurfaceDesignId();
  const name = normalizeSurfaceDesignName(typeof row.name === 'string' ? row.name : '');
  const createdAt =
    typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
  const updatedAt =
    typeof row.updatedAt === 'number' && Number.isFinite(row.updatedAt) ? row.updatedAt : createdAt;
  if (!name) return null;
  return {
    id,
    name,
    createdAt,
    updatedAt,
    config: row.config != null ? migrateConfig(row.config) : fallbackConfig,
  };
}

function createDefaultCatalog(config: VcModeConfig, now = Date.now()): VcSurfaceDesignCatalog {
  const design = createSurfaceDesign(config, new Set(), 'Default', now);
  return {
    version: VC_SURFACE_DESIGNS_VERSION,
    designs: [design],
    activeDesignId: design.id,
  };
}

function configsEqual(a: VcModeConfig, b: VcModeConfig): boolean {
  return JSON.stringify(normalizeVcConfig(a)) === JSON.stringify(normalizeVcConfig(b));
}

function hasDividerLayoutCustomization(config: VcModeConfig): boolean {
  const templateId = config.surface.templateId;
  const defaults = defaultDividersForTemplate(templateId);
  const resolved = resolveDividers(templateId, config.surface.dividers);
  return Object.keys(defaults).some(
    (key) => Math.abs((resolved[key] ?? defaults[key]!) - defaults[key]!) > 0.0005,
  );
}

/** Heuristic — layout, floats, assignments, or grid design differ from factory defaults. */
export function hasSurfaceCustomization(config: VcModeConfig): boolean {
  if (hasDividerLayoutCustomization(config)) return true;
  if (config.surface.floats.length > 0) return true;
  if (Object.keys(config.floatContent).length > 0) return true;
  if (config.cells.some((cell) => cell.slotA || cell.slotB)) return true;
  return JSON.stringify(normalizeVcConfig(config).gridDesign) !== JSON.stringify(DEFAULT_VC_GRID_DESIGN);
}

function customizationScore(config: VcModeConfig): number {
  let score = config.surface.floats.length + Object.keys(config.floatContent).length;
  score += config.cells.filter((cell) => cell.slotA || cell.slotB).length;
  return score;
}

function findDefaultDesignIndex(catalog: VcSurfaceDesignCatalog): number {
  const named = catalog.designs.findIndex((design) => design.name === 'Default');
  return named >= 0 ? named : 0;
}

/**
 * If the catalog was seeded with a stock layout but legacy `vc.lastConfig` still
 * holds the user's prior work, copy legacy into Default once.
 */
export function reconcileLegacyDefaultDesign(
  catalog: VcSurfaceDesignCatalog,
  legacyConfig: VcModeConfig,
): VcSurfaceDesignCatalog {
  if (!hasSurfaceCustomization(legacyConfig)) return catalog;

  const targetIndex = findDefaultDesignIndex(catalog);
  const target = catalog.designs[targetIndex];
  if (!target) return catalog;
  if (configsEqual(target.config, legacyConfig)) return catalog;

  const targetLooksStock = !hasSurfaceCustomization(target.config);
  const legacyIsRicher = customizationScore(legacyConfig) > customizationScore(target.config);
  const onlyDesign = catalog.designs.length === 1;

  if (!targetLooksStock && !(onlyDesign && legacyIsRicher)) return catalog;

  const designs = [...catalog.designs];
  designs[targetIndex] = {
    ...target,
    config: legacyConfig,
    updatedAt: Date.now(),
  };
  return { ...catalog, designs };
}

function buildCatalog(raw: unknown, fallbackConfig: VcModeConfig): VcSurfaceDesignCatalog {
  if (!raw || typeof raw !== 'object') {
    return createDefaultCatalog(fallbackConfig);
  }

  const row = raw as Record<string, unknown>;
  const designs = Array.isArray(row.designs)
    ? row.designs
        .map((entry) => sanitizeDesign(entry, fallbackConfig))
        .filter((entry): entry is VcSurfaceDesign => entry != null)
    : [];

  if (designs.length < VC_SURFACE_DESIGN_MIN_COUNT) {
    return createDefaultCatalog(fallbackConfig);
  }

  const activeDesignId =
    typeof row.activeDesignId === 'string' && designs.some((design) => design.id === row.activeDesignId)
      ? row.activeDesignId
      : designs[0]!.id;

  return {
    version: VC_SURFACE_DESIGNS_VERSION,
    designs,
    activeDesignId,
  };
}

export function sanitizeVcSurfaceDesignCatalogForSave(catalog: VcSurfaceDesignCatalog): VcSurfaceDesignCatalog {
  const fallbackConfig = catalog.designs[0]?.config ?? migrateConfig(null);
  const designs = catalog.designs
    .map((entry) => sanitizeDesign(entry, fallbackConfig))
    .filter((entry): entry is VcSurfaceDesign => entry != null);

  if (designs.length < VC_SURFACE_DESIGN_MIN_COUNT) {
    return createDefaultCatalog(fallbackConfig);
  }

  const activeDesignId = designs.some((design) => design.id === catalog.activeDesignId)
    ? catalog.activeDesignId
    : designs[0]!.id;

  return {
    version: VC_SURFACE_DESIGNS_VERSION,
    designs,
    activeDesignId,
  };
}

/** Load catalog shape without legacy recovery (for comparing before/after reconcile). */
export function buildVcSurfaceDesignCatalog(
  raw: unknown,
  legacyConfig?: unknown,
): VcSurfaceDesignCatalog {
  return buildCatalog(raw, migrateConfig(legacyConfig ?? null));
}

/** Load catalog from storage, or wrap legacy `vc.lastConfig` as the first design. */
export function migrateVcSurfaceDesignCatalog(
  raw: unknown,
  legacyConfig?: unknown,
): VcSurfaceDesignCatalog {
  const fallbackConfig = migrateConfig(legacyConfig ?? null);
  const catalog = buildCatalog(raw, fallbackConfig);
  return reconcileLegacyDefaultDesign(catalog, fallbackConfig);
}

export function findSurfaceDesign(
  catalog: VcSurfaceDesignCatalog,
  designId: string,
): VcSurfaceDesign | undefined {
  return catalog.designs.find((design) => design.id === designId);
}

export function activeSurfaceDesign(catalog: VcSurfaceDesignCatalog): VcSurfaceDesign {
  return findSurfaceDesign(catalog, catalog.activeDesignId) ?? catalog.designs[0]!;
}
