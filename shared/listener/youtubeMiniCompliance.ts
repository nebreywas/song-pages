/**
 * Pure decision logic for YouTube mini-player compliance.
 *
 * YouTube's TOS requires a playing video stay visible and unobstructed. The
 * listener's mini-player (minified) mode hides the in-window embed, so when a
 * YouTube track plays there we mitigate per the user's chosen behavior. The
 * decisions here are deliberately side-effect-free so they can be unit tested;
 * `ListenerMode.tsx` owns the React state, refs, and IPC that execute them.
 *
 * Why this lives in `shared/`: it is framework-free branching logic that was
 * previously inlined inside two large `useEffect`s in `ListenerMode.tsx`, where
 * it was regression-prone and untested. Extracting it lets tests lock the
 * behavior down without a DOM/React harness.
 */

import { isYoutubeSong } from '../youtube/youtubeFeature';
import type { YoutubeMiniPlayerBehavior } from './playerSettings';

/** Minimal shape needed to classify a song and identify it. */
export type ComplianceSong = {
  id: number;
  playback_scope?: string | null;
  page_url?: string | null;
};

/** Does the playlist contain anywhere for `skip` to land? */
export function hasNonYoutubeSong(songs: readonly ComplianceSong[]): boolean {
  return songs.some((song) => !isYoutubeSong(song));
}

/**
 * First non-YouTube song at or after the current one (wrapping once), skipping
 * the current track. Returns null when the whole playlist is YouTube. Jumping
 * directly (vs. dispatching NEXT) is reliable even when the YouTube track is
 * last with repeat off — NEXT would no-op there and leave the video playing.
 */
export function findNextNonYoutubeSong<T extends ComplianceSong>(
  songs: readonly T[],
  currentSongId: number | null,
): T | null {
  if (!songs.length) return null;
  const currentIndex = songs.findIndex((song) => song.id === currentSongId);
  const start = currentIndex >= 0 ? currentIndex + 1 : 0;
  for (let step = 0; step < songs.length; step += 1) {
    const song = songs[(start + step) % songs.length];
    if (song.id === currentSongId) continue;
    if (!isYoutubeSong(song)) return song;
  }
  return null;
}

/**
 * `skip` only makes sense when a non-YouTube track exists; on an all-YouTube
 * playlist it would just cycle hidden videos (or stop), so it downgrades to the
 * visible `projector` popup. Every other setting passes through unchanged.
 */
export function resolveEffectiveMiniBehavior(
  setting: YoutubeMiniPlayerBehavior,
  playlistHasNonYoutube: boolean,
): YoutubeMiniPlayerBehavior {
  return setting === 'skip' && !playlistHasNonYoutube ? 'projector' : setting;
}

// --- Minify rising-edge (un-minified → minified) --------------------------

export type MinifyEdgeInputs = {
  /** Effective behavior (already run through {@link resolveEffectiveMiniBehavior}). */
  behavior: YoutubeMiniPlayerBehavior;
  /** The now-playing track is an audible YouTube video. */
  playingIsYoutube: boolean;
  /** A now-playing track exists (playingSong != null). */
  hasPlayingSong: boolean;
  /** The main-pane embed is actually playing (true even for a browse preview). */
  mainPaneWidgetPlaying: boolean;
  /** Main content view is a song page. */
  mainContentIsSong: boolean;
  /** The shown song page is a YouTube page. */
  showingYoutubePage: boolean;
  /** A remote surface (VC/projector) already owns the audible YouTube embed. */
  youtubeRemoteCaptureActive: boolean;
  /** A song page is currently shown. */
  hasActiveSongPage: boolean;
  /** The shown song page is already the now-playing track (playingSongId === page id). */
  activeSongPageIsPlayingTrack: boolean;
};

/**
 * What to do at the moment the user minifies over a YouTube video.
 * - `restart-current`: re-assert playback of the now-playing YouTube track so
 *   the (possibly Chromium-suspended) embed reports playing and the projector
 *   handoff fires. Only for `projector` behavior; `expand`/`skip` act via the
 *   steady-state decision below.
 * - `promote-preview`: a browse-preview YouTube video is playing but was never
 *   promoted to the now-playing track, so no compliance keyed off the track
 *   engaged. Promote it so `playingIsYoutube` flips true.
 */
export type MinifyEdgeAction = 'none' | 'restart-current' | 'promote-preview';

export function decideMinifyEdgeAction(input: MinifyEdgeInputs): MinifyEdgeAction {
  // Case A: the now-playing track is a YouTube video.
  if (input.playingIsYoutube && input.hasPlayingSong) {
    return input.behavior === 'projector' ? 'restart-current' : 'none';
  }

  // Case B: a YouTube browse preview is playing but not the now-playing track.
  if (
    input.mainPaneWidgetPlaying &&
    input.mainContentIsSong &&
    input.showingYoutubePage &&
    !input.youtubeRemoteCaptureActive &&
    input.hasActiveSongPage &&
    !input.activeSongPageIsPlayingTrack
  ) {
    return 'promote-preview';
  }

  return 'none';
}

// --- Steady-state mini-player behavior ------------------------------------

/** Lifecycle of the compliance projector WE open (never one the user opened). */
export type ProjectorComplianceState = 'idle' | 'opening' | 'open';

export type MiniComplianceInputs = {
  /** Effective behavior (already run through {@link resolveEffectiveMiniBehavior}). */
  behavior: YoutubeMiniPlayerBehavior;
  chromeMinified: boolean;
  playingIsYoutube: boolean;
  isPlaying: boolean;
  projectorState: ProjectorComplianceState;
  /** Is a projector window currently open (any owner)? */
  projectorWindowOpen: boolean;
  /** Did WE previously auto-expand the player (for `expand` behavior)? */
  autoExpanded: boolean;
};

export type MiniComplianceAction =
  | { type: 'none' }
  /** `skip`: advance past the hidden YouTube track (same as Next). */
  | { type: 'skip-to-next' }
  /** `expand`: leave mini-player so the video is visible. */
  | { type: 'expand-player' }
  /** `expand`: drop back to mini-player once the YouTube track is gone. */
  | { type: 'restore-mini-player' }
  /** `projector`: open our compact compliance window. */
  | { type: 'open-projector' }
  /** `projector`: the user closed our window — skip rather than hide the video. */
  | { type: 'skip-projector-closed' }
  /** `projector`: no longer needed — close the window we opened. */
  | { type: 'close-projector' };

export type MiniComplianceDecision = {
  action: MiniComplianceAction;
  /** Next projector lifecycle state (unchanged unless the action moves it). */
  projectorState: ProjectorComplianceState;
  /** Next auto-expanded bookkeeping (unchanged unless the action moves it). */
  autoExpanded: boolean;
};

/**
 * Steady-state decision for the current mini-player behavior. Pure mirror of the
 * behavior `useEffect` in `ListenerMode.tsx`: given the inputs, return the side
 * effect to run plus the next projector/auto-expanded bookkeeping.
 */
export function decideMiniPlayerComplianceAction(
  input: MiniComplianceInputs,
): MiniComplianceDecision {
  const { behavior, chromeMinified, playingIsYoutube, isPlaying } = input;
  const unchanged: MiniComplianceDecision = {
    action: { type: 'none' },
    projectorState: input.projectorState,
    autoExpanded: input.autoExpanded,
  };

  // `skip` — advance past a hidden YouTube track while minified and playing.
  if (chromeMinified && playingIsYoutube && isPlaying && behavior === 'skip') {
    return { ...unchanged, action: { type: 'skip-to-next' } };
  }

  // `expand` — leave mini-player for the YouTube track, restore when it's gone.
  if (behavior === 'expand') {
    if (chromeMinified && playingIsYoutube && !input.autoExpanded) {
      return { action: { type: 'expand-player' }, projectorState: input.projectorState, autoExpanded: true };
    }
    if (input.autoExpanded && !playingIsYoutube) {
      return { action: { type: 'restore-mini-player' }, projectorState: input.projectorState, autoExpanded: false };
    }
    return unchanged;
  }

  // `projector` — host the embed in a small visible window while minified.
  if (behavior === 'projector') {
    if (chromeMinified && playingIsYoutube) {
      if (input.projectorState === 'idle') {
        if (isPlaying && !input.projectorWindowOpen) {
          return { action: { type: 'open-projector' }, projectorState: 'opening', autoExpanded: input.autoExpanded };
        }
        return unchanged;
      }
      if (input.projectorState === 'opening') {
        if (input.projectorWindowOpen) {
          return { action: { type: 'none' }, projectorState: 'open', autoExpanded: input.autoExpanded };
        }
        return unchanged;
      }
      // state === 'open'
      if (!input.projectorWindowOpen) {
        // The user closed our window — skip rather than leave the video hidden.
        return {
          action: isPlaying ? { type: 'skip-projector-closed' } : { type: 'none' },
          projectorState: 'idle',
          autoExpanded: input.autoExpanded,
        };
      }
      return unchanged;
    }

    // No longer minified over a YouTube video — tear down a window we opened.
    if (input.projectorState !== 'idle') {
      return {
        action: input.projectorWindowOpen ? { type: 'close-projector' } : { type: 'none' },
        projectorState: 'idle',
        autoExpanded: input.autoExpanded,
      };
    }
  }

  return unchanged;
}
