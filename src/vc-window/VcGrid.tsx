import type { VcGridStyle, VcStatePayload } from '@shared/vcModeTypes';
import { normalizeVcConfig } from '@shared/vcModeTypes';

import { VcCell } from './VcCell';

type VcGridProps = {
  state: VcStatePayload;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
};

const GRID_CLASS: Record<VcGridStyle, string> = {
  full: 'vc-grid-full',
  quarters: 'vc-grid-quarters',
  'halves-vertical': 'vc-grid-halves-vertical',
  'main-plus-2': 'vc-grid-main-plus-2',
};

export function VcGrid({ state, frequencyData, frame, canvasFrame }: VcGridProps) {
  const config = normalizeVcConfig(state.config);
  const gridClass = GRID_CLASS[config.gridStyle] ?? GRID_CLASS.full;

  return (
    <div className={`vc-grid ${gridClass}`}>
      {config.cells.map((cell, index) => (
        <VcCell
          key={index}
          cell={cell}
          state={state}
          frequencyData={frequencyData}
          frame={frame}
          canvasFrame={canvasFrame}
        />
      ))}
    </div>
  );
}
