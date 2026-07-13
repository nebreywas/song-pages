export const PLAYLIST_LENGTH_SETTINGS_KEY = 'ui.playlistLength';

export const MIN_CAUTION_MINUTES = 1;
export const MAX_CAUTION_MINUTES = 120;
export const DEFAULT_CAUTION_MINUTES = 8;

export type PlaylistLengthSettings = {
  /** Highlight playlist rows longer than the threshold. */
  cautionLongSongsEnabled: boolean;
  /** Whole minutes — 1 through 120. */
  cautionMinutes: number;
};

export const DEFAULT_PLAYLIST_LENGTH_SETTINGS: PlaylistLengthSettings = {
  cautionLongSongsEnabled: true,
  cautionMinutes: DEFAULT_CAUTION_MINUTES,
};

/** Clamp playlist caution minutes to the supported UI range. */
export function clampCautionMinutes(value: unknown, fallback = DEFAULT_CAUTION_MINUTES): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_CAUTION_MINUTES, Math.max(MIN_CAUTION_MINUTES, Math.trunc(parsed)));
}

/** Normalize persisted playlist length caution preferences. */
export function normalizePlaylistLengthSettings(raw: unknown): PlaylistLengthSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PLAYLIST_LENGTH_SETTINGS };
  }

  const value = raw as Partial<PlaylistLengthSettings>;
  return {
    cautionLongSongsEnabled: value.cautionLongSongsEnabled !== false,
    cautionMinutes: clampCautionMinutes(value.cautionMinutes),
  };
}
