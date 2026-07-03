import { butterchurnExperiences } from '../../butterchurn/presets/approved';
import { nativeExperiences } from '../../native/registry';
import type { VisualizerExperienceDefinition, VisualizerSurface } from '../types';
import { experienceSupportsSurface, targetToSurface } from '../types';
import type { PresentationTarget } from '../runtime/types';
import { normalizeExperienceId } from '../../native/registry';

const catalog: VisualizerExperienceDefinition[] = [...nativeExperiences, ...butterchurnExperiences];

export const DEFAULT_EXPERIENCE_ID = 'spectrum';

export function listExperiences(): VisualizerExperienceDefinition[] {
  return catalog;
}

export function getExperience(id: string): VisualizerExperienceDefinition | undefined {
  const normalized = normalizeExperienceId(id);
  return catalog.find((experience) => experience.id === normalized);
}

export function getSafeFallbackExperience(): VisualizerExperienceDefinition {
  return catalog.find((experience) => experience.isSafeFallback) ?? catalog[0];
}

export function listExperiencesForTarget(target: PresentationTarget): VisualizerExperienceDefinition[] {
  return catalog.filter((experience) => experience.targets.includes(target));
}

export function listExperiencesForSurface(surface: VisualizerSurface): VisualizerExperienceDefinition[] {
  return catalog.filter((experience) => experienceSupportsSurface(experience, surface));
}

export function defaultExperienceForTarget(target: PresentationTarget): VisualizerExperienceDefinition {
  const matches = listExperiencesForTarget(target);
  return matches[0] ?? getSafeFallbackExperience();
}

export function defaultExperienceForSurface(surface: VisualizerSurface): VisualizerExperienceDefinition {
  return defaultExperienceForTarget(surface === 'embedded' ? 'main-embedded' : 'external-projection');
}

export function resolveExperienceForTarget(
  experienceId: string,
  target: PresentationTarget,
): VisualizerExperienceDefinition {
  const experience = getExperience(experienceId);
  if (experience && experience.targets.includes(target)) return experience;
  return defaultExperienceForTarget(target);
}

export { targetToSurface };
