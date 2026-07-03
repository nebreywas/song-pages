import creditsJson from '../../../third-party/credits.json';
import { isButterchurnExperienceId } from '../butterchurn/presets/approved/presetKeys';
import { getExperience } from '../core/registry/catalog';

export type CreditEntry = {
  id: string;
  name: string;
  description?: string;
  license?: string;
  url?: string;
};

export type ExperienceCredits = {
  id: string;
  name: string;
  creditRefs: string[];
};

type CreditsRegistry = {
  entries: Record<string, CreditEntry>;
  experiences: Record<string, ExperienceCredits>;
};

const registry = creditsJson as CreditsRegistry;

export function resolveExperienceCredits(experienceId: string): CreditEntry[] {
  const experience = registry.experiences[experienceId];
  const creditRefs =
    experience?.creditRefs ??
    (isButterchurnExperienceId(experienceId) ? ['butterchurn', 'butterchurn-presets'] : []);

  return creditRefs
    .map((ref) => registry.entries[ref])
    .filter((entry): entry is CreditEntry => Boolean(entry));
}

export function getExperienceCreditTitle(experienceId: string): string {
  return registry.experiences[experienceId]?.name ?? getExperience(experienceId)?.name ?? experienceId;
}
