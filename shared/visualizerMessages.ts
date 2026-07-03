/** Shared message shapes for main ↔ visualizer window streaming. */

export type VisualizerSongInfo = {
  title: string;
  artist: string;
  coverUrl?: string | null;
};

export type VisualizerStreamFrame = {
  type: 'frame';
  frequency: number[] | Uint8Array;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  /** JPEG data URL — Butterchurn mirror frames for projection when Web Audio stays in main window. */
  canvasFrame?: string | null;
};

export type ProjectionMode = 'page' | 'visualizer';

export type VisualizerStreamConfig = {
  type: 'config';
  pluginId: string;
  song: VisualizerSongInfo | null;
  /** What the projection window shows — song page webview or FFT visualizer. */
  projectionMode?: ProjectionMode;
  pageUrl?: string | null;
};

export type VisualizerStreamMessage = VisualizerStreamFrame | VisualizerStreamConfig;

export const VISUALIZER_PORT_MESSAGE = 'songpages-visualizer-port';

/** @deprecated Use VISUALIZER_ACTIVE_EXPERIENCE_KEY from settings/persistence/keys */
export const VISUALIZER_SETTINGS_KEY = 'visualizer.activePluginId';

export const DEFAULT_VISUALIZER_ID = 'spectrum';
