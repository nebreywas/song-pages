/**
 * Decide which content the Projector window should show (non–VC Mode).
 *
 * Priority:
 * 1. Visualizer — sticky while the user opened projection from an active visualizer
 * 2. Video — YouTube (and future video files) when a track is current
 * 3. Song Page — song page or playlist homepage otherwise
 */

import { isYoutubeSong, YOUTUBE_PLAYBACK_SCOPE } from '../youtube/youtubeFeature';

export type ProjectorProjectionMode = 'page' | 'visualizer' | 'video';

export function isProjectorVideoSong(song: {
  playback_scope?: string | null;
  page_url?: string | null;
  playback_url?: string | null;
} | null | undefined): boolean {
  if (!song) return false;
  // Custom playlist YouTube rows use playback_scope; snapshot pages use page_url prefix.
  return isYoutubeSong(song) || song.playback_scope === YOUTUBE_PLAYBACK_SCOPE;
}

/**
 * Initial mode when opening the Projector window.
 * Embedded visualizer → project Visualizer; else Video for YT; else Song Page.
 */
export function resolveInitialProjectionMode(input: {
  embeddedVisualizerActive: boolean;
  playingSong: {
    playback_scope?: string | null;
    page_url?: string | null;
    playback_url?: string | null;
  } | null | undefined;
}): ProjectorProjectionMode {
  if (input.embeddedVisualizerActive) return 'visualizer';
  if (isProjectorVideoSong(input.playingSong)) return 'video';
  return 'page';
}

/**
 * While the Projector stays open (and not locked on Visualizer), keep Video ↔ Song Page
 * in sync with the current track.
 */
export function resolveLiveProjectionMode(input: {
  stickyVisualizer: boolean;
  playingSong: {
    playback_scope?: string | null;
    page_url?: string | null;
    playback_url?: string | null;
  } | null | undefined;
}): ProjectorProjectionMode {
  if (input.stickyVisualizer) return 'visualizer';
  if (isProjectorVideoSong(input.playingSong)) return 'video';
  return 'page';
}
