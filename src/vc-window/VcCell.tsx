import { useEffect, useMemo, useState } from 'react';

import type { VcCellAssignment, VcCellContent, VcStatePayload } from '@shared/vcModeTypes';

import { VcCellContentView } from './VcCellContentView';
import { useCellClickCooldown } from './useVcWindowState';

type VcCellProps = {
  cell: VcCellAssignment;
  state: VcStatePayload;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
};

function activeContents(cell: VcCellAssignment): VcCellContent[] {
  const items: VcCellContent[] = [];
  if (cell.slotA) items.push(cell.slotA);
  if (cell.slotB && cell.slotB !== cell.slotA) items.push(cell.slotB);
  return items;
}

/** One grid area — optional A/B cycling by timer or click. */
export function VcCell({ cell, state, frequencyData, frame, canvasFrame }: VcCellProps) {
  const contents = useMemo(() => activeContents(cell), [cell]);
  const [index, setIndex] = useState(0);
  const tryClick = useCellClickCooldown();

  useEffect(() => {
    setIndex(0);
  }, [cell.slotA, cell.slotB, state.currentSong?.id]);

  useEffect(() => {
    if (contents.length <= 1) return;
    if (cell.cycleTime === 'click' || cell.cycleTime == null) return;

    const intervalMs = cell.cycleTime * 1000;
    const timerId = window.setInterval(() => {
      setIndex((value) => (value + 1) % contents.length);
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [cell.cycleTime, contents.length]);

  if (!contents.length) {
    return <div className="vc-cell vc-cell-blank" />;
  }

  const current = contents[index] ?? contents[0];

  const onCellClick = () => {
    if (contents.length <= 1 || cell.cycleTime !== 'click') return;
    if (!tryClick()) return;
    setIndex((value) => (value + 1) % contents.length);
  };

  return (
    <div
      className={`vc-cell${cell.cycleTime === 'click' && contents.length > 1 ? ' vc-cell-clickable' : ''}`}
      onClick={onCellClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onCellClick();
      }}
      role={cell.cycleTime === 'click' && contents.length > 1 ? 'button' : undefined}
      tabIndex={cell.cycleTime === 'click' && contents.length > 1 ? 0 : undefined}
    >
      <VcCellContentView
        content={current}
        state={state}
        frequencyData={frequencyData}
        frame={frame}
        canvasFrame={canvasFrame}
      />
    </div>
  );
}
