import { normalizeVcConfig, type VcModeConfig } from '../vcModeTypes';
import type { VcProjectionWindowBounds } from '../vcMode/projectionWindow';

import { findSurfaceDesign, sanitizeVcSurfaceDesignCatalogForSave } from './migrate';
import type { VcSurfaceDesignCatalog } from './types';

/** Merge a full VC config into the catalog's active surface design entry. */
export function applyActiveDesignConfigUpdate(
  catalog: VcSurfaceDesignCatalog,
  config: VcModeConfig,
): VcSurfaceDesignCatalog {
  const normalized = normalizeVcConfig(config);
  const now = Date.now();
  return sanitizeVcSurfaceDesignCatalogForSave({
    ...catalog,
    designs: catalog.designs.map((design) =>
      design.id === catalog.activeDesignId
        ? { ...design, config: normalized, updatedAt: now }
        : design,
    ),
  });
}

/** Update projection window bounds on one surface design without touching layout on others. */
export function applyDesignProjectionWindowUpdate(
  catalog: VcSurfaceDesignCatalog,
  designId: string,
  bounds: VcProjectionWindowBounds,
): VcSurfaceDesignCatalog {
  const now = Date.now();
  return sanitizeVcSurfaceDesignCatalogForSave({
    ...catalog,
    designs: catalog.designs.map((design) =>
      design.id === designId
        ? {
            ...design,
            config: normalizeVcConfig({ ...design.config, projectionWindow: bounds }),
            updatedAt: now,
          }
        : design,
    ),
  });
}

/** Resolve saved projection bounds for the surface being started — never cross-design fallbacks. */
export function resolveProjectionWindowForDesign(
  config: VcModeConfig,
  catalog: VcSurfaceDesignCatalog | null,
  designId?: string,
): VcProjectionWindowBounds | undefined {
  if (config.projectionWindow) return config.projectionWindow;
  if (!catalog) return undefined;
  const design = designId
    ? findSurfaceDesign(catalog, designId)
    : findSurfaceDesign(catalog, catalog.activeDesignId);
  return design?.config.projectionWindow;
}
