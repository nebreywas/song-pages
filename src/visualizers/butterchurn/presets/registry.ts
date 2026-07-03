import { loadButterchurnPresets } from '../engine/loadModules';

let presetCache: Record<string, object> | null = null;

/** Load the full Butterchurn preset dictionary once per session. */
export async function getAllPresets(): Promise<Record<string, object>> {
  if (presetCache) return presetCache;
  const presets = await loadButterchurnPresets();
  presetCache = presets.getPresets();
  return presetCache;
}

/** Resolve an approved preset key — throws when missing so callers can fall back safely. */
export async function resolvePresetByKey(presetKey: string): Promise<object> {
  const all = await getAllPresets();
  const preset = all[presetKey];
  if (!preset) {
    throw new Error(`Butterchurn preset not found: ${presetKey}`);
  }
  return preset;
}
