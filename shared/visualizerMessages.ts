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
};

export type VisualizerStreamConfig = {
  type: 'config';
  pluginId: string;
  song: VisualizerSongInfo | null;
};

export type VisualizerStreamMessage = VisualizerStreamFrame | VisualizerStreamConfig;

export const VISUALIZER_PORT_MESSAGE = 'songpages-visualizer-port';

export const VISUALIZER_SETTINGS_KEY = 'visualizer.activePluginId';

export const DEFAULT_VISUALIZER_ID = 'bars';
