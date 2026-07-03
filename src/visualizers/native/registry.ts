import { AuroraVisualizer } from './canvas/aurora/AuroraVisualizer';
import { BarsVisualizer } from './canvas/spectrum/BarsVisualizer';
import { CoverPulseVisualizer } from './canvas/album-flow/CoverPulseVisualizer';
import type { VisualizerExperienceDefinition } from '../types';

const barsSettings = [
  {
    key: 'sensitivity',
    type: 'range' as const,
    label: 'Sensitivity',
    min: 0.5,
    max: 2,
    step: 0.1,
    default: 1,
  },
  {
    key: 'mirror',
    type: 'boolean' as const,
    label: 'Mirror',
    default: true,
  },
];

const coverPulseSettings = [
  {
    key: 'ringIntensity',
    type: 'range' as const,
    label: 'Ring intensity',
    min: 0.5,
    max: 2,
    step: 0.1,
    default: 1,
  },
];

const auroraSettings = [
  {
    key: 'speed',
    type: 'range' as const,
    label: 'Motion speed',
    min: 0.5,
    max: 2,
    step: 0.1,
    default: 1,
  },
];

/** Curated native Song Pages visualizers — migrated from the POC plugins. */
export const nativeExperiences: VisualizerExperienceDefinition[] = [
  {
    id: 'spectrum',
    name: 'Spectrum',
    description: 'Classic mirrored frequency bars.',
    category: 'spectrum',
    implementation: 'native-canvas',
    targets: ['main-embedded', 'external-projection', 'vc-region'],
    surfaces: 'both',
    settings: barsSettings,
    creditRefs: [],
    component: BarsVisualizer,
    isSafeFallback: true,
  },
  {
    id: 'album-flow',
    name: 'Album Flow',
    description: 'Album art with a reactive ring — best in the main player.',
    category: 'album',
    implementation: 'native-canvas',
    targets: ['main-embedded'],
    surfaces: 'embedded',
    settings: coverPulseSettings,
    creditRefs: [],
    component: CoverPulseVisualizer,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Flowing color field driven by bass, mids, and treble.',
    category: 'ambient',
    implementation: 'native-canvas',
    targets: ['external-projection', 'vc-region'],
    surfaces: 'window',
    settings: auroraSettings,
    creditRefs: [],
    component: AuroraVisualizer,
    windowComponent: AuroraVisualizer,
  },
];

/** Legacy POC ids mapped to 1.0 experience ids. */
export const LEGACY_EXPERIENCE_ID_MAP: Record<string, string> = {
  bars: 'spectrum',
  'cover-pulse': 'album-flow',
  aurora: 'aurora',
};

export function normalizeExperienceId(id: string): string {
  return LEGACY_EXPERIENCE_ID_MAP[id] ?? id;
}
