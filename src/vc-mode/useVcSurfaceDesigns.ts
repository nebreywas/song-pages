import { useCallback, useRef, useState } from 'react';

import {
  activeSurfaceDesign,
  buildVcSurfaceDesignCatalog,
  createSurfaceDesign,
  migrateVcSurfaceDesignCatalog,
  sanitizeVcSurfaceDesignCatalogForSave,
  VC_SURFACE_DESIGN_MIN_COUNT,
  VC_SURFACE_DESIGNS_KEY,
  type VcSurfaceDesignCatalog,
} from '@shared/vcSurfaceDesigns';
import { normalizeVcConfig, type VcModeConfig } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { createDefaultVcConfig } from './vcModeDefaults';

function catalogsEqual(a: VcSurfaceDesignCatalog, b: VcSurfaceDesignCatalog): boolean {
  return JSON.stringify(sanitizeVcSurfaceDesignCatalogForSave(a))
    === JSON.stringify(sanitizeVcSurfaceDesignCatalogForSave(b));
}

export function useVcSurfaceDesigns() {
  const [catalog, setCatalog] = useState<VcSurfaceDesignCatalog>(() =>
    migrateVcSurfaceDesignCatalog(null, createDefaultVcConfig()),
  );
  // Ref mirrors catalog so back-to-back persists (flush + switch/create) never read stale React state.
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const persist = useCallback(async (updater: (prev: VcSurfaceDesignCatalog) => VcSurfaceDesignCatalog) => {
    const normalized = sanitizeVcSurfaceDesignCatalogForSave(updater(catalogRef.current));
    catalogRef.current = normalized;
    setCatalog(normalized);
    await getApp()?.saveSettings?.(VC_SURFACE_DESIGNS_KEY, normalized);
    return normalized;
  }, []);

  const hydrateCatalog = useCallback(async (raw: unknown, legacyConfig: unknown) => {
    const before = raw ? buildVcSurfaceDesignCatalog(raw, legacyConfig) : null;
    const normalized = migrateVcSurfaceDesignCatalog(raw, legacyConfig);
    catalogRef.current = normalized;
    setCatalog(normalized);
    if (before && !catalogsEqual(before, normalized)) {
      await getApp()?.saveSettings?.(
        VC_SURFACE_DESIGNS_KEY,
        sanitizeVcSurfaceDesignCatalogForSave(normalized),
      );
    }
    return normalized;
  }, []);

  const updateActiveDesignConfig = useCallback(
    async (config: VcModeConfig) => {
      const normalized = normalizeVcConfig(config);
      const now = Date.now();
      return persist((prev) => ({
        ...prev,
        designs: prev.designs.map((design) =>
          design.id === prev.activeDesignId
            ? { ...design, config: normalized, updatedAt: now }
            : design,
        ),
      }));
    },
    [persist],
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
      if (!trimmed) return catalog;
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
