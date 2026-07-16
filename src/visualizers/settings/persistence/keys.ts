export const VISUALIZER_ACTIVE_EXPERIENCE_KEY = 'visualizer.activeExperienceId';

/** Legacy key — migrated to VISUALIZER_ACTIVE_EXPERIENCE_KEY on read. */
export const VISUALIZER_LEGACY_PLUGIN_KEY = 'visualizer.activePluginId';

export const VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY = 'visualizer.preference.mainPlayer';

/**
 * Global Meyda bass-drive toggle — shared across all Butterchurn presets so a song
 * change / preset swap doesn't look like the checkbox "disappeared".
 */
export const VISUALIZER_MEYDA_BASS_DRIVE_KEY = 'visualizer.meydaBassDrive';

export function visualizerSettingsKey(experienceId: string): string {
  return `visualizer.settings.${experienceId}`;
}
