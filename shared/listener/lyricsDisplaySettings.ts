export const LISTENER_LYRICS_DISPLAY_SETTINGS_KEY = 'ui.listenerLyrics';

/** How the listener song page renders the lyrics body. */
export type ListenerLyricsViewMode = 'plain' | 'markdown' | 'pretty';

export const LISTENER_LYRICS_VIEW_MODES: readonly ListenerLyricsViewMode[] = [
  'plain',
  'markdown',
  'pretty',
] as const;

export type ListenerLyricsDisplaySettings = {
  /** Hide square-bracket annotations (e.g. [Chorus]) at display time. */
  removeBrackets: boolean;
  /** Lyrics body renderer — plain / markdown / Pretty Lyrics. */
  viewMode: ListenerLyricsViewMode;
};

export const DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS: ListenerLyricsDisplaySettings = {
  removeBrackets: false,
  // Preserve historical listener behavior (markdown body) until the user picks another mode.
  viewMode: 'markdown',
};

function normalizeViewMode(raw: unknown): ListenerLyricsViewMode {
  if (raw === 'plain' || raw === 'markdown' || raw === 'pretty') return raw;
  return DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS.viewMode;
}

/** Normalize persisted listener lyrics display preferences. */
export function normalizeListenerLyricsDisplaySettings(
  raw: unknown,
): ListenerLyricsDisplaySettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS };
  }
  const value = raw as Partial<ListenerLyricsDisplaySettings>;
  return {
    removeBrackets: value.removeBrackets === true,
    viewMode: normalizeViewMode(value.viewMode),
  };
}
