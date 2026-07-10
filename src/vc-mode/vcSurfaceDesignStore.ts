/**
 * Shared read/write path for VC surface design catalog + legacy vc.lastConfig.
 * Both the Surface designer and live VC layout mode must persist through here
 * so the active design in `vc.surfaceDesigns` stays aligned with `vc.lastConfig`.
 */

import {
  activeSurfaceDesign,
  applyActiveDesignConfigUpdate,
  applyDesignProjectionWindowUpdate,
  buildVcSurfaceDesignCatalog,
  migrateVcSurfaceDesignCatalog,
  sanitizeVcSurfaceDesignCatalogForSave,
  VC_SURFACE_DESIGNS_KEY,
  type VcSurfaceDesignCatalog,
} from '@shared/vcSurfaceDesigns';
import { normalizeVcConfig, type VcModeConfig, type VcSurfaceDesignPickerState } from '@shared/vcModeTypes';
import type { VcProjectionWindowBounds } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { VC_SETTINGS_KEY } from './vcModeDefaults';

let catalogCache: VcSurfaceDesignCatalog | null = null;
let persistChain: Promise<unknown> = Promise.resolve();

function catalogsEqual(a: VcSurfaceDesignCatalog, b: VcSurfaceDesignCatalog): boolean {
  return JSON.stringify(sanitizeVcSurfaceDesignCatalogForSave(a))
    === JSON.stringify(sanitizeVcSurfaceDesignCatalogForSave(b));
}

function withPersistMutex<T>(fn: () => Promise<T>): Promise<T> {
  const next = persistChain.then(fn, fn);
  persistChain = next.catch(() => {});
  return next;
}

export function getCachedVcSurfaceDesignCatalog(): VcSurfaceDesignCatalog | null {
  return catalogCache;
}

/** Surface names for the VC controller dropdown. */
export function getVcSurfaceDesignPickerState(): VcSurfaceDesignPickerState | undefined {
  const catalog = catalogCache;
  if (!catalog || catalog.designs.length === 0) return undefined;
  return {
    activeDesignId: catalog.activeDesignId,
    designs: catalog.designs.map((design) => ({ id: design.id, name: design.name })),
  };
}

export function setCachedVcSurfaceDesignCatalog(catalog: VcSurfaceDesignCatalog): void {
  catalogCache = sanitizeVcSurfaceDesignCatalogForSave(catalog);
}

async function writeCatalogToDisk(catalog: VcSurfaceDesignCatalog): Promise<boolean> {
  const normalized = sanitizeVcSurfaceDesignCatalogForSave(catalog);
  catalogCache = normalized;
  return (await getApp()?.saveSettings?.(VC_SURFACE_DESIGNS_KEY, normalized)) ?? false;
}

export function awaitVcPersistIdle(): Promise<void> {
  return persistChain.then(() => {});
}

/** Load catalog from settings, reconcile with legacy vc.lastConfig, warm the in-memory cache. */
export async function hydrateVcSurfaceDesignCatalog(
  catalogRaw: unknown,
  legacyConfig: unknown,
): Promise<VcSurfaceDesignCatalog> {
  const before = catalogRaw ? buildVcSurfaceDesignCatalog(catalogRaw, legacyConfig) : null;
  const fromDisk = migrateVcSurfaceDesignCatalog(catalogRaw, legacyConfig);

  // Prefer in-memory catalog when it is fresher than disk (e.g. projection window just saved).
  if (catalogCache) {
    const cachedActive = catalogCache.designs.find((design) => design.id === catalogCache.activeDesignId);
    const diskActive = fromDisk.designs.find((design) => design.id === fromDisk.activeDesignId);
    if (
      cachedActive &&
      diskActive &&
      cachedActive.id === diskActive.id &&
      cachedActive.updatedAt >= diskActive.updatedAt
    ) {
      return catalogCache;
    }
  }

  const normalized = fromDisk;
  catalogCache = normalized;
  if (before && !catalogsEqual(before, normalized)) {
    await writeCatalogToDisk(normalized);
  }
  return normalized;
}

/** Persist catalog only (rename, switch active id, create/delete design). */
export async function persistVcSurfaceDesignCatalog(
  updater: (prev: VcSurfaceDesignCatalog) => VcSurfaceDesignCatalog,
): Promise<VcSurfaceDesignCatalog> {
  return withPersistMutex(async () => {
    const prev = catalogCache ?? migrateVcSurfaceDesignCatalog(null, null);
    const normalized = sanitizeVcSurfaceDesignCatalogForSave(updater(prev));
    await writeCatalogToDisk(normalized);
    return normalized;
  });
}

export async function persistVcProjectionWindow(
  designId: string,
  bounds: VcProjectionWindowBounds,
): Promise<boolean> {
  return withPersistMutex(async () => {
    const app = getApp();
    if (!app?.saveSettings) return false;

    const prevCatalog = catalogCache ?? migrateVcSurfaceDesignCatalog(
      await app.getSettings(VC_SURFACE_DESIGNS_KEY),
      null,
    );
    const nextCatalog = applyDesignProjectionWindowUpdate(prevCatalog, designId, bounds);
    catalogCache = nextCatalog;

    await app.saveSettings(VC_SURFACE_DESIGNS_KEY, nextCatalog);

    // Legacy single-config key mirrors the active design only.
    if (designId === nextCatalog.activeDesignId) {
      const active = activeSurfaceDesign(nextCatalog);
      await app.saveSettings(VC_SETTINGS_KEY, active.config);
    }
    return true;
  });
}

/**
 * Persist full VC config to legacy settings and the active surface design entry.
 * Used by designer autosave and live VC layout edits.
 */
export async function persistVcModeConfig(config: VcModeConfig): Promise<boolean> {
  return withPersistMutex(async () => {
    const normalized = normalizeVcConfig(config);
    const app = getApp();
    if (!app?.saveSettings) return false;

    const prevCatalog = catalogCache ?? migrateVcSurfaceDesignCatalog(
      await app.getSettings(VC_SURFACE_DESIGNS_KEY),
      normalized,
    );
    const nextCatalog = applyActiveDesignConfigUpdate(prevCatalog, normalized);
    catalogCache = nextCatalog;

    await app.saveSettings(VC_SETTINGS_KEY, normalized);
    await app.saveSettings(VC_SURFACE_DESIGNS_KEY, nextCatalog);
    return true;
  });
}

/** Resolve the active design config from persisted settings. */
export async function loadActiveVcModeConfig(): Promise<VcModeConfig> {
  const app = getApp();
  if (!app?.getSettings) {
    return activeSurfaceDesign(migrateVcSurfaceDesignCatalog(null, null)).config;
  }

  const [catalogRaw, legacyRaw] = await Promise.all([
    app.getSettings(VC_SURFACE_DESIGNS_KEY),
    app.getSettings(VC_SETTINGS_KEY),
  ]);
  const catalog = await hydrateVcSurfaceDesignCatalog(catalogRaw, legacyRaw);
  return activeSurfaceDesign(catalog).config;
}

/**
 * Save the live VC config into the current design, activate another design, persist.
 * Used by the VC controller surface picker during a show.
 */
export async function switchActiveVcSurfaceDesign(
  designId: string,
  currentConfig: VcModeConfig,
): Promise<VcModeConfig | null> {
  return withPersistMutex(async () => {
    const normalizedCurrent = normalizeVcConfig(currentConfig);
    const app = getApp();
    if (!app?.saveSettings) return null;

    const prevCatalog = catalogCache ?? migrateVcSurfaceDesignCatalog(
      await app.getSettings(VC_SURFACE_DESIGNS_KEY),
      normalizedCurrent,
    );
    if (!prevCatalog.designs.some((design) => design.id === designId)) return null;
    if (designId === prevCatalog.activeDesignId) {
      return activeSurfaceDesign(prevCatalog).config;
    }

    const now = Date.now();
    const nextCatalog = sanitizeVcSurfaceDesignCatalogForSave({
      ...prevCatalog,
      activeDesignId: designId,
      designs: prevCatalog.designs.map((design) =>
        design.id === prevCatalog.activeDesignId
          ? { ...design, config: normalizedCurrent, updatedAt: now }
          : design,
      ),
    });
    const nextConfig = activeSurfaceDesign(nextCatalog).config;
    catalogCache = nextCatalog;

    await app.saveSettings(VC_SETTINGS_KEY, nextConfig);
    await app.saveSettings(VC_SURFACE_DESIGNS_KEY, nextCatalog);
    return nextConfig;
  });
}
