/** Shared message shapes for main ↔ visualizer window streaming. */

import type { ListenerLyricsDisplaySettings } from './listener/lyricsDisplaySettings';
import type { SongPageFontIncreaseLevel } from './listener/playerSettings';

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

/** Content routed into the Projector Electron window (VC Mode uses its own window). */
export type ProjectionMode = 'page' | 'visualizer' | 'video';

/** YouTube (and later local video) payload for Projector: Video theater. */
export type ProjectorVideoPayload = {
  provider: 'youtube';
  videoId: string;
  songId: number;
  volume: number;
};

/** Native in-app song pages that cannot be loaded as remote webviews. */
export type ProjectorNativePagePayload =
  | {
      kind: 'soundcloud';
      songId: number;
      title: string;
      artist: string | null;
      coverUrl: string | null;
      permalink: string;
    }
  | {
      kind: 'flow';
      songId: number;
      title: string;
      artist: string | null;
      coverUrl: string | null;
      /** Flow "Sound" prompt / about text from the catalog row. */
      caption: string | null;
      songManifestUrl: string | null;
    }
  | {
      kind: 'suno';
      songId: number;
      title: string;
      artist: string | null;
      coverUrl: string | null;
      year: string | null;
      caption: string | null;
      pageUrl: string | null;
      songManifestUrl: string | null;
      externalId: string | null;
      playbackScope: string | null;
      /** Serialized Suno Studio clip metadata JSON from the catalog row. */
      providerMetadataJson: string | null;
    };

export type VisualizerStreamConfig = {
  type: 'config';
  experienceId: string;
  song: VisualizerSongInfo | null;
  /** What the Projector window shows — song page, FFT visualizer, or video theater. */
  projectionMode?: ProjectionMode;
  /** Active song page URL when projecting Song Page. */
  pageUrl?: string | null;
  /** Playlist / artist homepage when no song page is loaded. */
  homepageUrl?: string | null;
  /** Native song-page projection (preferred over pageUrl for SoundCloud, etc.). */
  nativePage?: ProjectorNativePagePayload | null;
  /** Present when projectionMode === 'video'. */
  video?: ProjectorVideoPayload | null;
  /** Listener lyrics display prefs — keep Projector native song pages in sync with the player. */
  lyricsDisplay?: ListenerLyricsDisplaySettings | null;
  /** Song page font bump (0–4) — keep Projector pages in sync with Player settings. */
  songPageFontIncreaseLevel?: SongPageFontIncreaseLevel | null;
  /**
   * Playback clock for Projector: Video (FFT frames are not sent in video mode).
   * Also useful for song-page title sync while paused.
   */
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
};

export type VisualizerStreamMessage = VisualizerStreamFrame | VisualizerStreamConfig;

export const VISUALIZER_PORT_MESSAGE = 'songpages-visualizer-port';

export const DEFAULT_VISUALIZER_ID = 'spectrum';
