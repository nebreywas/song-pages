import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  formatDualSlotSuppressedMessage,
  selectRenderableCellContents,
} from '@shared/vcMode/dualSlotAvailability';
import {
  VC_CONTENT_LABELS,
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
import { buildLiveVcResolutionContext } from './vcResolutionContext';
import { useOptionalVcVisualizerRotationContext } from './VcVisualizerRotationContext';

type VcCellProps = {
  cell: VcCellAssignment;
  hostCatalog: HostContentCatalog;
  state: VcStatePayload;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
  /** Float cells omit the solid area background so transparency shows through. */
  isFloat?: boolean;
  /** Layout mode — block click-to-cycle and transport controls. */
  interactionDisabled?: boolean;
  /** e.g. "Area 1" / "Float 2" — used when logging dual-slot suppression. */
  regionLabel?: string;
};

function hostBindingForContent(
  cell: VcCellAssignment,
  content: VcCellContent,
): VcHostSlotBinding | null {
  if (content === cell.slotA) return cell.hostSlotA;
  if (content === cell.slotB) return cell.hostSlotB;
  return null;
}

/** One surface region — optional primary/secondary cycling with replace or fade. */
export function VcCell({
  cell,
  hostCatalog,
  state,
  frequencyData,
  frame,
  canvasFrame,
  isFloat = false,
  interactionDisabled = false,
  regionLabel = 'Region',
}: VcCellProps) {
  const resolutionCtx = useMemo(
    () => buildLiveVcResolutionContext(state, hostCatalog),
    [
      hostCatalog,
      state.currentSong,
      state.artistName,
      state.artistBio,
      state.artistPhotoUrl,
      state.playback,
      state.upcoming,
      state.config.useFallbacks,
      state.config.suppressEmbedProviderLyricsMessages,
      state.lyricsSourceReady,
      state.config.gridDesign,
    ],
  );

  const availability = useMemo(
    () => selectRenderableCellContents(cell, resolutionCtx),
    [cell, resolutionCtx],
  );

  const contents = availability.contents;
  const switchingSuppressed = availability.switchingSuppressed;
  const [index, setIndex] = useState(0);
  const tryClick = useCellClickCooldown();
  // Dual-slot cycling is voided when one side has nothing to show for this song.
  const canSwitch = contents.length > 1 && !switchingSuppressed;
  const useFade = cell.transitionStyle === 'fade' && canSwitch;
  const rotation = useOptionalVcVisualizerRotationContext();
  const hasVisualizer = contents.includes('visualizer');
  const visualizerClickEnabled = hasVisualizer && Boolean(rotation?.visualizerClickEnabled);

  useEffect(() => {
    setIndex(0);
  }, [cell.slotA, cell.slotB, state.currentSong?.id]);

  // Keep the layer index valid when availability collapses to a single slot.
  useEffect(() => {
    setIndex((value) => (contents.length === 0 ? 0 : value % contents.length));
  }, [contents.length]);

  useEffect(() => {
    if (!switchingSuppressed) return;
    // Temporary console sink — later these should route to a VC host log.
    console.info(formatDualSlotSuppressedMessage(regionLabel, availability));
    // availability is memoized on song/cell/resolution inputs.
  }, [switchingSuppressed, regionLabel, state.currentSong?.id, availability]);

  useEffect(() => {
    if (!canSwitch) return;
    if (cell.cycleTime === 'click' || cell.cycleTime == null) return;

    const intervalMs = cell.cycleTime * 1000;
    const timerId = window.setInterval(() => {
      setIndex((value) => (value + 1) % contents.length);
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [canSwitch, cell.cycleTime, contents.length]);

  if (!contents.length) {
    return <div className={`vc-cell vc-cell-blank${isFloat ? ' vc-cell-float' : ''}`} />;
  }

  const current = contents[index] ?? contents[0];

  const onCellClick = () => {
    if (interactionDisabled) return;

    const active = contents[index] ?? contents[0];
    if (visualizerClickEnabled && active === 'visualizer') {
      if (!tryClick()) return;
      rotation?.rotateVisualizer();
      return;
    }

    if (!canSwitch || cell.cycleTime !== 'click') return;
    if (!tryClick()) return;
    setIndex((value) => (value + 1) % contents.length);
  };

  const isClickable =
    !interactionDisabled &&
    ((cell.cycleTime === 'click' && canSwitch) ||
      (visualizerClickEnabled && (contents[index] ?? contents[0]) === 'visualizer'));

  const sharedViewProps = {
    hostCatalog,
    state,
    frequencyData,
    frame,
    canvasFrame,
  };

  return (
    <div
      className={`vc-cell${isFloat ? ' vc-cell-float' : ''}${isClickable ? ' vc-cell-clickable' : ''}${useFade ? ' vc-cell-fade' : ''}${interactionDisabled ? ' vc-cell-layout-locked' : ''}`}
      onClick={onCellClick}
      onKeyDown={(event) => {
        if (interactionDisabled) return;
        if (event.key === 'Enter' || event.key === ' ') onCellClick();
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={
        useFade ? ({ '--vc-fade-ms': `${VC_TRANSITION_FADE_MS}ms` } as CSSProperties) : undefined
      }
      data-vc-switch-suppressed={switchingSuppressed ? 'true' : undefined}
      title={
        switchingSuppressed
          ? `Showing ${contents.map((c) => VC_CONTENT_LABELS[c]).join(', ')} only (partner content missing)`
          : undefined
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
