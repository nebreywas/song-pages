import {
  DEFAULT_EXPERIENCE_ID,
  defaultExperienceForSurface,
  getExperience,
  getSafeFallbackExperience,
  listExperiences,
  listExperiencesForSurface,
  resolveExperienceForTarget,
} from './core/registry/catalog';
import type { VisualizerSurface } from './core/types';

/** Backward-compatible registry API — delegates to Visualizer System 1.0 catalog. */
export function listVisualizers() {
  return listExperiences();
}

export function getVisualizer(id: string) {
  return getExperience(id);
}

export { getExperience, defaultExperienceForSurface };

export function listVisualizersForSurface(surface: VisualizerSurface) {
  return listExperiencesForSurface(surface);
}

export function defaultVisualizerForSurface(surface: VisualizerSurface) {
  return defaultExperienceForSurface(surface);
}

export function visualizerSupportsSurface(
  plugin: { surfaces: VisualizerSurface },
  surface: VisualizerSurface,
): boolean {
  return plugin.surfaces === surface || plugin.surfaces === 'both';
}

export { DEFAULT_EXPERIENCE_ID as DEFAULT_VISUALIZER_ID, getSafeFallbackExperience, resolveExperienceForTarget };
export { normalizeExperienceId } from './native/registry';
