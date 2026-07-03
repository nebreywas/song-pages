import { useEffect, useRef, useState } from 'react';

import { getExperience } from '../core/registry/catalog';
import { defaultSettingsFromSchema } from '../core/settings/schema/defaults';
import type { VisualizerSettingsValues } from '../core/settings/schema/types';
import { loadExperienceSettings } from '../settings/persistence/store';

type UseExperienceSettingsOptions = {
  /** Reload persisted values when the settings dialog closes. */
  settingsDialogOpen?: boolean;
};

/** Load persisted settings for an experience — falls back to schema defaults. */
export function useExperienceSettings(
  experienceId: string,
  options?: UseExperienceSettingsOptions,
): VisualizerSettingsValues {
  const experience = getExperience(experienceId);
  const schema = experience?.settings ?? [];
  const [values, setValues] = useState<VisualizerSettingsValues>(() => defaultSettingsFromSchema(schema));
  const [revision, setRevision] = useState(0);
  const prevDialogOpen = useRef(false);

  useEffect(() => {
    const open = options?.settingsDialogOpen ?? false;
    if (prevDialogOpen.current && !open) {
      setRevision((current) => current + 1);
    }
    prevDialogOpen.current = open;
  }, [options?.settingsDialogOpen]);

  useEffect(() => {
    if (!experience) return;

    let cancelled = false;
    void loadExperienceSettings(experience.id, experience.settings).then((loaded) => {
      if (!cancelled) setValues(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [experience, experienceId, revision]);

  return values;
}
