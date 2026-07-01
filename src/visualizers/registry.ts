import { AuroraVisualizer } from './aurora/AuroraVisualizer';
import { BarsVisualizer } from './bars/BarsVisualizer';
import { CoverPulseVisualizer } from './coverPulse/CoverPulseVisualizer';
import type { VisualizerPlugin, VisualizerSurface } from './types';

const plugins: VisualizerPlugin[] = [
  {
    id: 'bars',
    name: 'Spectrum Bars',
    description: 'Classic mirrored frequency bars.',
    surfaces: 'both',
    component: BarsVisualizer,
  },
  {
    id: 'cover-pulse',
    name: 'Cover Pulse',
    description: 'Album art with a reactive ring — best in the panel.',
    surfaces: 'embedded',
    component: CoverPulseVisualizer,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Fullscreen flowing color field driven by bass, mids, and treble.',
    surfaces: 'window',
    component: AuroraVisualizer,
    windowComponent: AuroraVisualizer,
  },
];

export function listVisualizers(): VisualizerPlugin[] {
  return plugins;
}

export function getVisualizer(id: string): VisualizerPlugin | undefined {
  return plugins.find((plugin) => plugin.id === id);
}

export function listVisualizersForSurface(surface: VisualizerSurface): VisualizerPlugin[] {
  return plugins.filter((plugin) => plugin.surfaces === surface || plugin.surfaces === 'both');
}

export function defaultVisualizerForSurface(surface: VisualizerSurface): VisualizerPlugin {
  const matches = listVisualizersForSurface(surface);
  return matches[0] ?? plugins[0];
}

export function visualizerSupportsSurface(plugin: VisualizerPlugin, surface: VisualizerSurface): boolean {
  return plugin.surfaces === surface || plugin.surfaces === 'both';
}
