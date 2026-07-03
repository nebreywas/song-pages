import { getApp } from '../../../lib/bridge';
import { resolveSettingsValues } from '../../core/settings/schema/defaults';
import type { VisualizerSettingField, VisualizerSettingsValues } from '../../core/settings/schema/types';
import { visualizerSettingsKey } from './keys';

export async function loadExperienceSettings(
  experienceId: string,
  schema: VisualizerSettingField[],
): Promise<VisualizerSettingsValues> {
  const app = getApp();
  if (!app?.getSettings) {
    return resolveSettingsValues(schema, null);
  }

  const raw = await app.getSettings(visualizerSettingsKey(experienceId));
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return resolveSettingsValues(schema, raw as VisualizerSettingsValues);
  }

  return resolveSettingsValues(schema, null);
}

export async function saveExperienceSettings(
  experienceId: string,
  schema: VisualizerSettingField[],
  values: VisualizerSettingsValues,
): Promise<void> {
  const app = getApp();
  if (!app?.saveSettings) return;

  const resolved = resolveSettingsValues(schema, values);
  await app.saveSettings(visualizerSettingsKey(experienceId), resolved);
}
