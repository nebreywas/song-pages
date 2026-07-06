import type { VcVisualizerSequence } from '@shared/vcMode/visualizerSettings';

import { listVisualizers, visualizerSupportsSurface } from './registry';

/** Window-capable visualizer ids for VC rotation pools. */
export function listVcVisualizerPool(sequence: VcVisualizerSequence): string[] {
  const windowCapable = listVisualizers().filter(
    (plugin) => visualizerSupportsSurface(plugin, 'window') || visualizerSupportsSurface(plugin, 'both'),
  );

  switch (sequence) {
    case 'random-builtin':
      return windowCapable
        .filter((plugin) => plugin.implementation !== 'butterchurn')
        .map((plugin) => plugin.id);
    case 'random-milkdrop':
      return windowCapable
        .filter((plugin) => plugin.implementation === 'butterchurn')
        .map((plugin) => plugin.id);
    default:
      return windowCapable.map((plugin) => plugin.id);
  }
}
