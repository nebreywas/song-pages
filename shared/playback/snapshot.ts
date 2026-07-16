import type { PlaybackDetourState, RepeatMode } from '../detours/state';

/** High-level transport state — VC countdown UI stays out of session. */
export type PlaybackPhase = 'playing' | 'paused' | 'waiting-for-host';

export type MediaSourceKind = 'hls' | 'direct' | 'youtube' | 'soundcloud' | 'flow' | null;

/**
 * Authoritative playback read model. High-frequency FFT data intentionally excluded.
 * Timing fields update on subscribe; avoid wiring 60fps UI directly to every tick in Phase 1.
 */
export type PlaybackSnapshot = {
  activeTrackId: number | null;
  playbackPhase: PlaybackPhase;
  repeatMode: RepeatMode;
  shuffle: boolean;
  currentTime: number;
  duration: number;
  detours: PlaybackDetourState;
  vcActive: boolean;
  playLockEnabled: boolean;
  playLockReleaseOnNext: boolean;
  mediaSource: MediaSourceKind;
};
