import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VcSurfaceConfig } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { createDefaultVcConfig } from '../vc-mode/vcModeDefaults';
import { useVcVisualizerRotation } from '../vc-mode/useVcVisualizerRotation';
import { VcOverlays } from './VcOverlays';
import { VcSurface } from './VcSurface';
import { VcVisualizerRotationProvider } from './VcVisualizerRotationContext';
import { useHostContentCatalog } from '../host-content/useHostContentCatalog';
import { VcAlareNudgeProvider } from './VcAlareNudgeContext';
import { useVcPlaybackAudio } from './useVcPlaybackAudio';
import { useVcWindowState } from './useVcWindowState';
import { KudoLayer } from '../kudos/KudoLayer';

/** VC Mode display surface — template areas + floats + host hotkey overlays. */
export function VcWindowApp() {
  const {
    state,
    frequencyData,
    frame,
    canvasFrame,
    activeOverlay,
    kudoTriggerToken,
    debugOutlines,
    layoutMode,
    onChangeSurface,
  } = useVcWindowState();
  const { catalog: hostCatalog } = useHostContentCatalog({ readOnly: true });
  const playbackAudioRef = useVcPlaybackAudio(state);

  const [layoutSurface, setLayoutSurface] = useState<VcSurfaceConfig | null>(null);
  const layoutSurfaceRef = useRef<VcSurfaceConfig | null>(null);
  const prevLayoutModeRef = useRef(false);

  layoutSurfaceRef.current = layoutSurface;

  // Enter layout mode: snapshot surface. Exit: commit geometry then clear local copy.
  useEffect(() => {
    const wasLayoutMode = prevLayoutModeRef.current;

    if (layoutMode && !wasLayoutMode && state) {
      setLayoutSurface(state.config.surface);
    }

    if (wasLayoutMode && !layoutMode) {
      const surface = layoutSurfaceRef.current;
      if (surface) {
        getApp()?.vc?.commitSurface?.(surface);
      }
      setLayoutSurface(null);
    }

    prevLayoutModeRef.current = layoutMode;
  }, [layoutMode, state]);

  // Persist in-progress layout edits if the projection window closes while still in layout mode.
  useEffect(() => {
    const onUnload = () => {
      if (!prevLayoutModeRef.current) return;
      const surface = layoutSurfaceRef.current;
      if (surface) {
        getApp()?.vc?.commitSurface?.(surface);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const handleChangeSurface = useCallback(
    (patch: Partial<VcSurfaceConfig>) => {
      setLayoutSurface((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...patch,
          dividers: patch.dividers ?? prev.dividers,
          floats: patch.floats ?? prev.floats,
        };
      });
      onChangeSurface(patch);
    },
    [onChangeSurface],
  );

  const displayState = useMemo(() => {
    if (!state || !layoutMode || !layoutSurface) return state;
    return {
      ...state,
      config: {
        ...state.config,
        surface: layoutSurface,
      },
    };
  }, [layoutMode, layoutSurface, state]);

  const visualizerRotation = useVcVisualizerRotation({
    vcOpen: displayState != null,
    config: displayState?.config ?? createDefaultVcConfig(),
    playingSongId:
      displayState?.audioMirror?.songId ?? displayState?.currentSong?.id ?? null,
    reportToMain: true,
  });

  const rotationContextValue = useMemo(
    () => ({
      activeVisualizerId: visualizerRotation.effectiveVisualizerId,
      rotateVisualizer: visualizerRotation.rotateVisualizer,
      visualizerClickEnabled: visualizerRotation.visualizerClickEnabled,
    }),
    [
      visualizerRotation.effectiveVisualizerId,
      visualizerRotation.rotateVisualizer,
      visualizerRotation.visualizerClickEnabled,
    ],
  );

  return (
    <>
      {/* Always mounted so mirrored playback can start as soon as state arrives. */}
      <audio
        ref={playbackAudioRef}
        className="vc-playback-audio"
        preload="auto"
        aria-hidden="true"
      />
      {!displayState ? (
        <div className="vc-window-shell vc-window-waiting">
          <p>VC Mode — waiting for Song Pages…</p>
          <p className="vc-window-hint">Start VC Mode from the main window while a song is playing.</p>
        </div>
      ) : (
        <VcAlareNudgeProvider playingSongId={displayState.currentSong?.id ?? null}>
        <div className={`vc-window-shell${layoutMode ? ' vc-window-layout-mode' : ''}`}>
          {layoutMode ? (
            <div className="vc-layout-mode-hud" aria-live="polite">
              Layout mode — drag orange dividers to resize areas; drag floats to move. Arrow keys nudge 1px. Press ⌘⌥L to exit.
            </div>
          ) : null}
          <VcVisualizerRotationProvider value={rotationContextValue}>
            <VcSurface
              state={{
                ...displayState,
                effectiveVisualizerId: visualizerRotation.effectiveVisualizerId,
              }}
              hostCatalog={hostCatalog}
              frequencyData={frequencyData}
              frame={frame}
              canvasFrame={canvasFrame}
              debugOutlines={debugOutlines}
              layoutMode={layoutMode}
              onChangeSurface={layoutMode ? handleChangeSurface : undefined}
            />
            {!layoutMode ? (
              <>
                <KudoLayer
                  presets={displayState.kudoPresets ?? []}
                  triggerToken={kudoTriggerToken}
                />
                <VcOverlays state={displayState} activeOverlay={activeOverlay} />
              </>
            ) : null}
          </VcVisualizerRotationProvider>
        </div>
        </VcAlareNudgeProvider>
      )}
    </>
  );
}
