import {
  createDefaultSurface,
  defaultCells,
  DEFAULT_VC_GRID_DESIGN,
  normalizeVcConfig,
  type VcModeConfig,
  type VcTemplateId,
  VC_SETTINGS_KEY,
} from '@shared/vcModeTypes';
import {
  DEFAULT_VC_VISUALIZER_CHANGE_RULE,
  DEFAULT_VC_VISUALIZER_SEQUENCE,
} from '@shared/vcMode/visualizerSettings';
import { DEFAULT_SPECIAL_PLAY_STYLE_SETTINGS } from '@shared/vcMode/specialPlayStyles';
import { DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS } from '@shared/vcMode/upcomingOverlaySettings';
import { migrateVcConfig as migrateSurfaceConfig } from '@shared/vcSurface/migrate';
import { DEFAULT_VISUALIZER_ID } from '@shared/visualizerMessages';
import { normalizeExperienceId } from '../visualizers/native/registry';

export function createDefaultVcConfig(templateId: VcTemplateId = 'quad'): VcModeConfig {
  return normalizeVcConfig({
    surface: createDefaultSurface(templateId),
    cells: defaultCells(),
    floatContent: {},
    visualizerId: DEFAULT_VISUALIZER_ID,
    visualizerChangeRule: DEFAULT_VC_VISUALIZER_CHANGE_RULE,
    visualizerSequence: DEFAULT_VC_VISUALIZER_SEQUENCE,
    useFallbacks: true,
    gridDesign: { ...DEFAULT_VC_GRID_DESIGN },
    specialPlayStyle: { ...DEFAULT_SPECIAL_PLAY_STYLE_SETTINGS },
    hostGraphicPopupId: null,
    upcomingOverlay: { ...DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS },
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
