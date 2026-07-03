import {
  approvedButterchurnPresets,
  butterchurnPresetKeyByExperienceId,
} from './approvedPresetCatalog.generated';

export {
  approvedButterchurnPresets,
  butterchurnPresetKeyByExperienceId,
} from './approvedPresetCatalog.generated';
export type { ApprovedButterchurnPreset } from './presetTypes';
export { BUTTERCHURN_PRESET_BLOCKLIST } from './presetBlocklist';

export function getButterchurnPresetKey(experienceId: string): string | null {
  return butterchurnPresetKeyByExperienceId[experienceId] ?? null;
}

export function isButterchurnExperienceId(experienceId: string): boolean {
  return experienceId in butterchurnPresetKeyByExperienceId;
}
