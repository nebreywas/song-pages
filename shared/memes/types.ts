/**
 * Meme Surface — shared types.
 *
 * A "meme" in VC Mode is any host-supplied animated graphic addressed by a
 * DIRECT media URL — a `.gif`, `.png`/`.apng`, `.webp`, `.mp4`, or `.webm`
 * file. There is no provider integration of any kind: the host pastes a link
 * that points straight at a media file, we verify it exists and is small
 * enough, then project it onto a region designated `meme-surface`.
 *
 * @see documentation/vc-mode-architecture.md — Meme Surface section
 */

/** Media the projector can render directly. */
export type MemeMediaType = 'gif' | 'video';

/** A resolved, directly-renderable meme (what the projector consumes). */
export type ResolvedMeme = {
  mediaType: MemeMediaType;
  /** Absolute http(s) URL to an image (GIF/PNG/WebP) or a video (MP4/WebM). */
  url: string;
};

/** Maximum media size accepted by the Meme Field (enforced via a HEAD probe). */
export const MEME_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Host-configurable behavior for how a projected meme plays and clears.
 * Persisted in `VcModeConfig.memeSettings`.
 */
export type MemeSettings = {
  /** Clicking the projected meme clears it immediately. */
  clickClears: boolean;
  /**
   * Play until the next meme is sent or an explicit CLEAR — ignores duration
   * and roundtrip limits when true.
   */
  playIndefinitely: boolean;
  /** Minimum on-screen seconds before auto-clear (used when not indefinite). */
  durationSeconds: number;
  /**
   * Minimum completed loops before auto-clear. Only enforceable for VIDEO memes
   * (MP4/WebM) — GIFs do not expose loop events, so this is ignored for GIFs.
   * The effective clear time is "whichever is greater" of duration vs roundtrips.
   */
  minRoundtrips: number;
  /**
   * When a roundtrip target is set, clear at the end of a completed loop rather
   * than mid-cycle (avoids cutting the animation off partway).
   */
  clearAfterCycle: boolean;
};

export const DEFAULT_MEME_SETTINGS: MemeSettings = {
  clickClears: true,
  playIndefinitely: false,
  durationSeconds: 12,
  minRoundtrips: 0,
  clearAfterCycle: true,
};

/** Bounds to keep host input and persisted config sane. */
export const MEME_MIN_DURATION_SECONDS = 1;
export const MEME_MAX_DURATION_SECONDS = 600;
export const MEME_MAX_ROUNDTRIPS = 100;

/**
 * A live meme currently being projected. Rides on `VcStatePayload.activeMeme`
 * and is transient (never persisted). `token` changes on every new meme so the
 * projector can restart playback/timers even if the URL repeats.
 */
export type ActiveMeme = {
  media: ResolvedMeme;
  /** Monotonic id for this projection instance. */
  token: number;
  /** Epoch ms when the main process began projecting (drives duration clears). */
  startedAt: number;
  /** Snapshot of the settings in force for this meme. */
  settings: MemeSettings;
};
