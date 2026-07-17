export const LISTENER_PLAYER_SETTINGS_KEY = 'ui.listenerPlayer';

export type SeekTimeDisplay = 'remaining' | 'duration';

/**
 * What to do when a YouTube video track plays while the main window is in
 * mini-player (minified) mode. Mini-player hides the in-window embed, which
 * violates YouTube's requirement that the player stay visible at size, so we
 * must actively mitigate. See documentation/third-party-integrations.md.
 *
 *   'projector' → pop the embed into a small Projector window (default)
 *   'expand'    → temporarily un-minify the player, restore mini on track end
 *   'skip'      → skip YouTube tracks entirely while minified
 */
export type YoutubeMiniPlayerBehavior = 'projector' | 'expand' | 'skip';

export const YOUTUBE_MINI_PLAYER_BEHAVIORS: readonly YoutubeMiniPlayerBehavior[] = [
  'projector',
  'expand',
  'skip',
];

/**
 * Song page typography bump on top of each page’s own default.
 * 0 = no increase; 1–4 are the user-facing steps (actual % is abstracted).
 */
export type SongPageFontIncreaseLevel = 0 | 1 | 2 | 3 | 4;

export type ListenerPlayerSettings = {
  /** Right seek label — countdown remaining or total track length. */
  seekTimeDisplay: SeekTimeDisplay;
  /**
   * When true, Suno song pages show style tags + Style prompt text.
   * Default off — keep song pages lyrics-forward.
   */
  showSunoPromptInformation: boolean;
  /** Extra song-page type scale (1–4); 0 keeps the page’s built-in size. */
  songPageFontIncreaseLevel: SongPageFontIncreaseLevel;
  /** YouTube-TOS mitigation when a YouTube track plays in mini-player mode. */
  youtubeMiniPlayerBehavior: YoutubeMiniPlayerBehavior;
};

export const DEFAULT_LISTENER_PLAYER_SETTINGS: ListenerPlayerSettings = {
  seekTimeDisplay: 'remaining',
  showSunoPromptInformation: false,
  songPageFontIncreaseLevel: 0,
  youtubeMiniPlayerBehavior: 'projector',
};

/** Multipliers for levels 1–4 — keep UI labels as 1–4 only. */
const SONG_PAGE_FONT_SCALE_BY_LEVEL: Record<SongPageFontIncreaseLevel, number> = {
  0: 1,
  1: 1.05,
  2: 1.1,
  3: 1.2,
  4: 1.3,
};

export function normalizeSongPageFontIncreaseLevel(raw: unknown): SongPageFontIncreaseLevel {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded <= 0) return 0;
  if (rounded >= 4) return 4;
  return rounded as SongPageFontIncreaseLevel;
}

/** CSS zoom / root font-size multiplier for a level (1 = unchanged). */
export function songPageFontScaleFromLevel(level: SongPageFontIncreaseLevel): number {
  return SONG_PAGE_FONT_SCALE_BY_LEVEL[level] ?? 1;
}

/** Inline style for native song-page roots (Chromium `zoom` scales rem content too). */
export function songPageFontIncreaseStyle(
  level: SongPageFontIncreaseLevel,
): { zoom: number } | undefined {
  const scale = songPageFontScaleFromLevel(level);
  if (scale === 1) return undefined;
  return { zoom: scale };
}

/** Coerce persisted/unknown input into a valid YouTube mini-player behavior. */
export function normalizeYoutubeMiniPlayerBehavior(raw: unknown): YoutubeMiniPlayerBehavior {
  return YOUTUBE_MINI_PLAYER_BEHAVIORS.includes(raw as YoutubeMiniPlayerBehavior)
    ? (raw as YoutubeMiniPlayerBehavior)
    : 'projector';
}

/** Normalize persisted listener player UI preferences. */
export function normalizeListenerPlayerSettings(raw: unknown): ListenerPlayerSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LISTENER_PLAYER_SETTINGS };
  }
  const value = raw as Partial<ListenerPlayerSettings>;
  return {
    seekTimeDisplay: value.seekTimeDisplay === 'duration' ? 'duration' : 'remaining',
    showSunoPromptInformation: value.showSunoPromptInformation === true,
    songPageFontIncreaseLevel: normalizeSongPageFontIncreaseLevel(value.songPageFontIncreaseLevel),
    youtubeMiniPlayerBehavior: normalizeYoutubeMiniPlayerBehavior(value.youtubeMiniPlayerBehavior),
  };
}

export function toggleSeekTimeDisplay(current: SeekTimeDisplay): SeekTimeDisplay {
  return current === 'remaining' ? 'duration' : 'remaining';
}
