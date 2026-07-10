import { useCallback, useRef, useState } from 'react';

import {
  activeSurfaceDesign,
  createSurfaceDesign,
  migrateVcSurfaceDesignCatalog,
  VC_SURFACE_DESIGN_MIN_COUNT,
  type VcSurfaceDesignCatalog,
} from '@shared/vcSurfaceDesigns';
import { normalizeVcConfig, type VcModeConfig } from '@shared/vcModeTypes';

import { createDefaultVcConfig } from './vcModeDefaults';
import {
  getCachedVcSurfaceDesignCatalog,
  hydrateVcSurfaceDesignCatalog,
  persistVcModeConfig,
  persistVcSurfaceDesignCatalog,
  setCachedVcSurfaceDesignCatalog,
} from './vcSurfaceDesignStore';

export function useVcSurfaceDesigns() {
  const [catalog, setCatalog] = useState<VcSurfaceDesignCatalog>(() =>
    getCachedVcSurfaceDesignCatalog()
      ?? migrateVcSurfaceDesignCatalog(null, createDefaultVcConfig()),
  );
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const syncCatalog = useCallback((next: VcSurfaceDesignCatalog) => {
    catalogRef.current = next;
    setCatalog(next);
    setCachedVcSurfaceDesignCatalog(next);
  }, []);

  const persist = useCallback(async (updater: (prev: VcSurfaceDesignCatalog) => VcSurfaceDesignCatalog) => {
    const normalized = await persistVcSurfaceDesignCatalog((prev) =>
      updater(catalogRef.current ?? prev),
    );
    syncCatalog(normalized);
    return normalized;
  }, [syncCatalog]);

  const hydrateCatalog = useCallback(async (raw: unknown, legacyConfig: unknown) => {
    const normalized = await hydrateVcSurfaceDesignCatalog(raw, legacyConfig);
    syncCatalog(normalized);
    return normalized;
  }, [syncCatalog]);

  const updateActiveDesignConfig = useCallback(
    async (config: VcModeConfig) => persistVcModeConfig(config),
    [],
  );

  const switchDesign = useCallback(
    async (designId: string, currentConfig: VcModeConfig) => {
      const normalizedCurrent = normalizeVcConfig(currentConfig);
      const now = Date.now();
      const nextCatalog = await persist((prev) => {
        if (designId === prev.activeDesignId) return prev;
        return {
          ...prev,
          activeDesignId: designId,
          designs: prev.designs.map((design) =>
            design.id === prev.activeDesignId
              ? { ...design, config: normalizedCurrent, updatedAt: now }
              : design,
          ),
        };
      });
      const nextDesign = activeSurfaceDesign(nextCatalog);
      return { catalog: nextCatalog, config: nextDesign.config };
    },
    [persist],
  );

  const createDesign = useCallback(
    async (currentConfig: VcModeConfig) => {
      const normalizedCurrent = normalizeVcConfig(currentConfig);
      const now = Date.now();
      const nextCatalog = await persist((prev) => {
        const names = new Set(prev.designs.map((design) => design.name));
        const created = createSurfaceDesign(createDefaultVcConfig(), names);
        return {
          ...prev,
          activeDesignId: created.id,
          designs: [
            ...prev.designs.map((design) =>
              design.id === prev.activeDesignId
                ? { ...design, config: normalizedCurrent, updatedAt: now }
                : design,
            ),
            created,
          ],
        };
      });
      const nextDesign = activeSurfaceDesign(nextCatalog);
      return { catalog: nextCatalog, config: nextDesign.config };
    },
    [persist],
  );

  const renameDesign = useCallback(
    async (designId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return catalogRef.current ?? catalog;
      const now = Date.now();
      return persist((prev) => ({
        ...prev,
        designs: prev.designs.map((design) =>
          design.id === designId ? { ...design, name: trimmed, updatedAt: now } : design,
        ),
      }));
    },
    [catalog, persist],
  );

  const deleteDesign = useCallback(
    async (designId: string, currentConfig: VcModeConfig) => {
      const normalizedCurrent = normalizeVcConfig(currentConfig);
      const now = Date.now();
      const nextCatalog = await persist((prev) => {
        if (prev.designs.length <= VC_SURFACE_DESIGN_MIN_COUNT) return prev;
        const designs = prev.designs
          .map((design) =>
            design.id === prev.activeDesignId
              ? { ...design, config: normalizedCurrent, updatedAt: now }
              : design,
          )
          .filter((design) => design.id !== designId);
        return {
          ...prev,
          designs,
          activeDesignId:
            prev.activeDesignId === designId ? designs[0]!.id : prev.activeDesignId,
        };
      });
      if (nextCatalog.designs.some((design) => design.id === designId)) {
        return null;
      }
      const nextDesign = activeSurfaceDesign(nextCatalog);
      return { catalog: nextCatalog, config: nextDesign.config };
    },
    [persist],
  );

  return {
    catalog,
    activeDesign: activeSurfaceDesign(catalog),
    hydrateCatalog,
    updateActiveDesignConfig,
    switchDesign,
    createDesign,
    renameDesign,
    deleteDesign,
  };
}
