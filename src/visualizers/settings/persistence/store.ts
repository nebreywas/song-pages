import { getApp } from '../../../lib/bridge';
import { resolveSettingsValues } from '../../core/settings/schema/defaults';
import type { VisualizerSettingField, VisualizerSettingsValues } from '../../core/settings/schema/types';
import { VISUALIZER_MEYDA_BASS_DRIVE_KEY, visualizerSettingsKey } from './keys';

async function loadGlobalMeydaBassDrive(): Promise<boolean | null> {
  const app = getApp();
  if (!app?.getSettings) return null;
  const raw = await app.getSettings(VISUALIZER_MEYDA_BASS_DRIVE_KEY);
  return typeof raw === 'boolean' ? raw : null;
}

async function saveGlobalMeydaBassDrive(value: boolean): Promise<void> {
  const app = getApp();
  if (!app?.saveSettings) return;
  await app.saveSettings(VISUALIZER_MEYDA_BASS_DRIVE_KEY, value);
}

export async function loadExperienceSettings(
  experienceId: string,
  schema: VisualizerSettingField[],
): Promise<VisualizerSettingsValues> {
  const app = getApp();
  if (!app?.getSettings) {
    return resolveSettingsValues(schema, null);
  }

  const raw = await app.getSettings(visualizerSettingsKey(experienceId));
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? resolveSettingsValues(schema, raw as VisualizerSettingsValues)
      : resolveSettingsValues(schema, null);

  // Overlay global Meyda bass drive so the checkbox doesn't vanish across presets/songs.
  if (schema.some((field) => field.key === 'meydaBassDrive')) {
    const globalDrive = await loadGlobalMeydaBassDrive();
    if (globalDrive != null) {
      base.meydaBassDrive = globalDrive;
    }
  }

  return base;
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

  if (schema.some((field) => field.key === 'meydaBassDrive') && typeof resolved.meydaBassDrive === 'boolean') {
    await saveGlobalMeydaBassDrive(resolved.meydaBassDrive);
  }
}
