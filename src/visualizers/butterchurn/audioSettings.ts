import { useEffect } from 'react';

import type { ButterchurnAudioSettings } from '../audioGraph';
import type { VisualizerSettingsValues } from '../core/settings/schema/types';

const DEFAULT_SENSITIVITY = 1;
const DEFAULT_BASS_EMPHASIS = 0;

/** Map persisted Butterchurn experience settings to Web Audio node values. */
export function resolveButterchurnAudioSettings(
  settings: VisualizerSettingsValues,
): ButterchurnAudioSettings {
  const sensitivity =
    typeof settings.sensitivity === 'number' ? settings.sensitivity : DEFAULT_SENSITIVITY;
  const bassEmphasis =
    typeof settings.bassEmphasis === 'number' ? settings.bassEmphasis : DEFAULT_BASS_EMPHASIS;
  return { sensitivity, bassEmphasis };
}

/** Push Butterchurn-only gain/EQ whenever experience settings change. */
export function useApplyButterchurnAudioSettings(
  applySettings: ((settings: ButterchurnAudioSettings) => void) | null,
  settings: VisualizerSettingsValues,
): void {
  useEffect(() => {
    if (!applySettings) return;
    applySettings(resolveButterchurnAudioSettings(settings));
  }, [applySettings, settings.bassEmphasis, settings.sensitivity]);
}
