import type { VisualizerSongInfo } from '@shared/visualizerMessages';

/** Structured Song Pages data passed to native visualizers — not arbitrary app state. */
export type VisualizerContext = {
  song: VisualizerSongInfo | null;
  /** Reserved for future catalog/artist-aware experiences. */
  genres?: string[];
  album?: string | null;
  year?: string | null;
};
