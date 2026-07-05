import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  VC_TRANSITION_FADE_MS,
  songSlotSettingsForContent,
  type VcCellAssignment,
  type VcCellContent,
  type VcHostSlotBinding,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import type { HostContentCatalog } from '@shared/hostContent';

import { VcCellContentView } from './VcCellContentView';
import { useCellClickCooldown } from './useVcWindowState';

type VcCellProps = {
  cell: VcCellAssignment;
  hostCatalog: HostContentCatalog;
  state: VcStatePayload;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
};

function hostBindingForContent(
  cell: VcCellAssignment,
  content: VcCellContent,
): VcHostSlotBinding | null {
  if (content === cell.slotA) return cell.hostSlotA;
  if (content === cell.slotB) return cell.hostSlotB;
  return null;
}

function activeContents(cell: VcCellAssignment): VcCellContent[] {
  const items: VcCellContent[] = [];
  if (cell.slotA) items.push(cell.slotA);
  if (cell.slotB && cell.slotB !== cell.slotA) items.push(cell.slotB);
  return items;
}

/** One surface region — optional primary/secondary cycling with replace or fade. */
export function VcCell({ cell, hostCatalog, state, frequencyData, frame, canvasFrame }: VcCellProps) {
  const contents = useMemo(() => activeContents(cell), [cell]);
  const [index, setIndex] = useState(0);
  const tryClick = useCellClickCooldown();
  const useFade = cell.transitionStyle === 'fade' && contents.length > 1;

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

  const sharedViewProps = {
    hostCatalog,
    state,
    frequencyData,
    frame,
    canvasFrame,
  };

  return (
    <div
      className={`vc-cell${cell.cycleTime === 'click' && contents.length > 1 ? ' vc-cell-clickable' : ''}${useFade ? ' vc-cell-fade' : ''}`}
      onClick={onCellClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onCellClick();
      }}
      role={cell.cycleTime === 'click' && contents.length > 1 ? 'button' : undefined}
      tabIndex={cell.cycleTime === 'click' && contents.length > 1 ? 0 : undefined}
      style={
        useFade ? ({ '--vc-fade-ms': `${VC_TRANSITION_FADE_MS}ms` } as CSSProperties) : undefined
      }
    >
      {useFade ? (
        contents.map((content, layerIndex) => (
          <div
            key={`${content}-${layerIndex}`}
            className="vc-cell-layer"
            style={{ opacity: layerIndex === index ? 1 : 0 }}
          >
            <VcCellContentView
              content={content}
              hostBinding={hostBindingForContent(cell, content)}
              songBinding={songSlotSettingsForContent(cell, content)}
              {...sharedViewProps}
            />
          </div>
        ))
      ) : (
        <VcCellContentView
          content={current}
          hostBinding={hostBindingForContent(cell, current)}
          songBinding={songSlotSettingsForContent(cell, current)}
          {...sharedViewProps}
        />
      )}
    </div>
  );
}
