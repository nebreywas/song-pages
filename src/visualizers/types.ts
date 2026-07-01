import type { FC } from 'react';
import type { VisualizerSongInfo } from '@shared/visualizerMessages';

/** Where a visualizer plugin is allowed to render. */
export type VisualizerSurface = 'embedded' | 'window' | 'both';

export type VisualizerFrameProps = {
  /** Live analyser — only set in embedded mode; window mode uses streamed buffers. */
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  width: number;
  height: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  song: VisualizerSongInfo | null;
  /** Incremented each animation frame so canvas effects re-run. */
  frame: number;
};

export type VisualizerPlugin = {
  id: string;
  name: string;
  description: string;
  surfaces: VisualizerSurface;
  /** Canvas/React visualizer — used for embedded and window when no windowComponent. */
  component: FC<VisualizerFrameProps>;
  /** Optional fullscreen-optimized variant. */
  windowComponent?: FC<VisualizerFrameProps>;
};
