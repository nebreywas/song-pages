export const VISUALIZER_ACTIVE_EXPERIENCE_KEY = 'visualizer.activeExperienceId';

/** Legacy key — migrated to VISUALIZER_ACTIVE_EXPERIENCE_KEY on read. */
export const VISUALIZER_LEGACY_PLUGIN_KEY = 'visualizer.activePluginId';

export const VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY = 'visualizer.preference.mainPlayer';
export const VISUALIZER_VC_PREFERENCE_KEY = 'visualizer.preference.vcMode';

export function visualizerSettingsKey(experienceId: string): string {
  return `visualizer.settings.${experienceId}`;
}
