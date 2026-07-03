import type { ButterchurnPresetsStatic, ButterchurnStatic } from 'butterchurn';

let butterchurnModule: ButterchurnStatic | null = null;

/** All preset pack entry points shipped in butterchurn-presets@2.4.7. */
const PRESET_PACK_IMPORTS = [
  () => import('butterchurn-presets'),
  () => import('butterchurn-presets/lib/butterchurnPresetsExtra.min.js'),
  () => import('butterchurn-presets/lib/butterchurnPresetsExtra2.min.js'),
  () => import('butterchurn-presets/lib/butterchurnPresetsMD1.min.js'),
  () => import('butterchurn-presets/lib/butterchurnPresetsNonMinimal.min.js'),
  () => import('butterchurn-presets/lib/butterchurnPresetsMinimal.min.js'),
] as const;

/**
 * UMD/CJS packages surface static APIs inconsistently under Vite:
 * - dev prebundle: `{ default: ButterchurnClass }` or nested `{ default: { default: Class } }`
 * - prod lazy chunk: `{ b: { default: Class, ... } }` with no top-level default
 * Walk the module graph until we find the object that owns the requested static method.
 */
function resolveStaticExport<T extends Record<string, unknown>>(
  mod: unknown,
  methodName: string,
): T {
  const visited = new Set<unknown>();
  const queue: unknown[] = [mod];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null || visited.has(current)) continue;
    visited.add(current);

    if (typeof current === 'function' || typeof current === 'object') {
      const candidate = current as T;
      if (typeof candidate[methodName] === 'function') {
        return candidate;
      }
    }

    if (typeof current !== 'object') continue;

    const record = current as Record<string, unknown>;
    if ('default' in record) queue.push(record.default);
    for (const value of Object.values(record)) {
      if (value != null && (typeof value === 'object' || typeof value === 'function')) {
        queue.push(value);
      }
    }
  }

  throw new Error(`Module missing ${methodName} export.`);
}

/** Lazy-load UMD bundles — keeps initial bundle smaller until a Butterchurn experience is selected. */
export async function loadButterchurn(): Promise<ButterchurnStatic> {
  if (butterchurnModule) return butterchurnModule;
  const mod = await import('butterchurn');
  butterchurnModule = resolveStaticExport<ButterchurnStatic>(mod, 'createVisualizer');
  return butterchurnModule;
}

/** Load and merge every preset pack from butterchurn-presets. */
export async function loadButterchurnPresets(): Promise<ButterchurnPresetsStatic> {
  const merged: Record<string, object> = {};

  for (const loadPack of PRESET_PACK_IMPORTS) {
    const mod = await loadPack();
    const pack = resolveStaticExport<ButterchurnPresetsStatic>(mod, 'getPresets');
    Object.assign(merged, pack.getPresets());
  }

  return {
    getPresets: () => merged,
  };
}
