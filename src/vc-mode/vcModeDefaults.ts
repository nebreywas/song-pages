import {
  createDefaultSurface,
  defaultCells,
  DEFAULT_VC_GRID_DESIGN,
  normalizeVcConfig,
  type VcModeConfig,
  type VcTemplateId,
  VC_SETTINGS_KEY,
} from '@shared/vcModeTypes';
import { migrateVcConfig as migrateSurfaceConfig } from '@shared/vcSurface/migrate';
import { DEFAULT_VISUALIZER_ID } from '@shared/visualizerMessages';
import { normalizeExperienceId } from '../visualizers/native/registry';

export function createDefaultVcConfig(templateId: VcTemplateId = 'quad'): VcModeConfig {
  return normalizeVcConfig({
    surface: createDefaultSurface(templateId),
    cells: defaultCells(),
    floatContent: {},
    visualizerId: DEFAULT_VISUALIZER_ID,
    useFallbacks: true,
    gridDesign: { ...DEFAULT_VC_GRID_DESIGN },
  });
}

export function migrateVcConfig(raw: unknown): VcModeConfig {
  const migrated = migrateSurfaceConfig(raw, DEFAULT_VISUALIZER_ID);
  return {
    ...migrated,
    visualizerId: normalizeExperienceId(migrated.visualizerId),
  };
}

export { VC_SETTINGS_KEY };
