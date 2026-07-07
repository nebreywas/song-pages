import type { KudoPreset } from './types';

/**
 * Advance cycle index for ⌘⌥P test trigger (§28.2).
 * Returns null when no presets exist.
 */
export function nextKudoCycleIndex(presets: KudoPreset[], currentIndex: number): number | null {
  if (presets.length === 0) return null;
  if (currentIndex < 0 || currentIndex >= presets.length) return 0;
  return (currentIndex + 1) % presets.length;
}

/** Resolve preset at cycle index; null if list empty or index invalid. */
export function kudoPresetAtCycleIndex(presets: KudoPreset[], index: number): KudoPreset | null {
  if (presets.length === 0 || index < 0 || index >= presets.length) return null;
  return presets[index] ?? null;
}
