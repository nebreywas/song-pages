import type { VisualizerSettingField } from '../../../../core/settings/schema/types';
import { createButterchurnExperienceComponent } from '../../adapter/ButterchurnExperience';
import { approvedButterchurnPresets } from './presetKeys';

const sharedSettings: VisualizerSettingField[] = [
  {
    key: 'sensitivity',
    type: 'range',
    label: 'Visualizer gain',
    description: 'Boosts signal to the visualizer only — does not change playback volume.',
    min: 0.5,
    max: 2,
    step: 0.1,
    default: 1,
  },
  {
    key: 'bassEmphasis',
    type: 'range',
    label: 'Bass emphasis',
    description: 'Weights kick and bass for the visualizer only — does not change what you hear.',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0,
  },
  {
    key: 'blendSeconds',
    type: 'range',
    label: 'Preset blend',
    description: 'Seconds to crossfade when switching presets.',
    min: 0,
    max: 3,
    step: 0.1,
    default: 0.8,
  },
  {
    key: 'scanline',
    type: 'boolean',
    label: 'Scanlines',
    default: false,
  },
];

/** User-facing Butterchurn experiences registered in the main catalog. */
export const butterchurnExperiences = approvedButterchurnPresets.map((preset) => ({
  id: preset.id,
  name: preset.name,
  description: preset.description,
  category: preset.category,
  implementation: 'butterchurn' as const,
  targets: ['main-embedded', 'external-projection'] as const,
  surfaces: 'both' as const,
  settings: sharedSettings,
  creditRefs: preset.creditRefs,
  component: createButterchurnExperienceComponent(preset.id),
  windowComponent: createButterchurnExperienceComponent(preset.id),
  butterchurnPresetKey: preset.presetKey,
}));
