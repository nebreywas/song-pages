/** Declarative per-experience settings — drives the Visualizer Settings dialog. */

export type VisualizerSettingFieldBase = {
  key: string;
  label: string;
  description?: string;
};

export type VisualizerRangeSetting = VisualizerSettingFieldBase & {
  type: 'range';
  min: number;
  max: number;
  step: number;
  default: number;
};

export type VisualizerBooleanSetting = VisualizerSettingFieldBase & {
  type: 'boolean';
  default: boolean;
};

export type VisualizerSelectSetting = VisualizerSettingFieldBase & {
  type: 'select';
  options: Array<{ value: string; label: string }>;
  default: string;
};

export type VisualizerSettingField =
  | VisualizerRangeSetting
  | VisualizerBooleanSetting
  | VisualizerSelectSetting;

export type VisualizerSettingsValues = Record<string, boolean | number | string>;
