export {
  VC_SURFACE_DESIGN_MIN_COUNT,
  VC_SURFACE_DESIGN_NAME_MAX_LEN,
  VC_SURFACE_DESIGNS_KEY,
  VC_SURFACE_DESIGNS_VERSION,
} from './constants';
export { createSurfaceDesign, createSurfaceDesignId } from './factory';
export { defaultSurfaceDesignName, normalizeSurfaceDesignName, validateSurfaceDesignName } from './names';
export {
  activeSurfaceDesign,
  findSurfaceDesign,
  buildVcSurfaceDesignCatalog,
  hasSurfaceCustomization,
  migrateVcSurfaceDesignCatalog,
  reconcileLegacyDefaultDesign,
  sanitizeVcSurfaceDesignCatalogForSave,
} from './migrate';
export {
  applyActiveDesignConfigUpdate,
  applyDesignProjectionWindowUpdate,
  resolveProjectionWindowForDesign,
} from './catalogOps';
export type { VcSurfaceDesign, VcSurfaceDesignCatalog } from './types';
