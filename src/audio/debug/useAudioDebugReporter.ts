import { useEffect } from 'react';

import type { ProjectionMode } from '@shared/visualizerMessages';

import { getAudioGraphIfExists } from '../graph/registry';
import { audioDebug } from './audioDebug';
import { measureFrequencyBins } from '../analysis/frequencyBins';
import { snapshotAudioElement } from '../analysis/snapshotElement';

type UseAudioDebugReporterOptions = {
  surface: 'main' | 'projection';
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
  mirrorAudioRef: React.RefObject<HTMLAudioElement | null>;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  isPlaying: boolean;
  embeddedActive: boolean;
  windowOpen: boolean;
  projectionMode: ProjectionMode;
  activeSession: string;
  analyserEnabled: boolean;
  mirrorEnabled: boolean;
  experienceId: string;
};

/** Poll pipeline state into the shared debug store (~4 Hz). */
export function useAudioDebugReporter({
  surface,
  mainAudioRef,
  mirrorAudioRef,
  analyser,
  frequencyData,
  isPlaying,
  embeddedActive,
  windowOpen,
  projectionMode,
  activeSession,
  analyserEnabled,
  mirrorEnabled,
  experienceId,
}: UseAudioDebugReporterOptions): void {
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const main = mainAudioRef.current;
      const mirror = mirrorAudioRef.current;
      const graph = mirror ? getAudioGraphIfExists(mirror) : null;
      const fft = measureFrequencyBins(frequencyData);

      audioDebug.patchSnapshot({
        isPlaying,
        main: snapshotAudioElement(main),
        mirror: snapshotAudioElement(mirror),
        graph: {
          attached: Boolean(graph),
          mode: graph?.mode ?? null,
          contextState: graph?.context.state ?? analyser?.context.state ?? null,
          speakerGain: graph?.speakerGain?.gain.value ?? null,
          fftSize: graph?.analyser.fftSize ?? analyser?.fftSize ?? null,
        },
        analyser: {
          connected: Boolean(analyser),
          peakBin: fft.peak,
          avgBin: fft.avg,
          silent: fft.silent,
        },
        visualizer: {
          embeddedActive,
          windowOpen,
          projectionMode,
          activeSession,
          analyserEnabled,
          mirrorEnabled,
          experienceId,
        },
        ipc: {
          role: surface === 'main' ? 'sender' : audioDebug.getSnapshot().ipc.role,
        },
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [
    activeSession,
    analyser,
    analyserEnabled,
    embeddedActive,
    experienceId,
    frequencyData,
    isPlaying,
    mainAudioRef,
    mirrorAudioRef,
    mirrorEnabled,
    projectionMode,
    surface,
    windowOpen,
  ]);
}
