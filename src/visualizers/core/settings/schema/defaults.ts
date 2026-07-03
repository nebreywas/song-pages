import type { VisualizerSettingField, VisualizerSettingsValues } from './types';

/** Build default values object from a declarative settings schema. */
export function defaultSettingsFromSchema(schema: VisualizerSettingField[]): VisualizerSettingsValues {
  const values: VisualizerSettingsValues = {};
  for (const field of schema) {
    values[field.key] = field.default;
  }
  return values;
}

/** Merge persisted values with schema defaults — drops unknown keys, fills missing keys. */
export function resolveSettingsValues(
  schema: VisualizerSettingField[],
  persisted: VisualizerSettingsValues | null | undefined,
): VisualizerSettingsValues {
  const defaults = defaultSettingsFromSchema(schema);
  if (!persisted) return defaults;

  for (const field of schema) {
    const value = persisted[field.key];
    if (value === undefined) continue;

    if (field.type === 'boolean' && typeof value === 'boolean') {
      defaults[field.key] = value;
    } else if (field.type === 'range' && typeof value === 'number') {
      defaults[field.key] = Math.min(field.max, Math.max(field.min, value));
    } else if (field.type === 'select' && typeof value === 'string') {
      if (field.options.some((option) => option.value === value)) {
        defaults[field.key] = value;
      }
    }
  }

  return defaults;
}
