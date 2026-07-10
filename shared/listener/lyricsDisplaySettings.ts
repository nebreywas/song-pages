export const LISTENER_LYRICS_DISPLAY_SETTINGS_KEY = 'ui.listenerLyrics';

export type ListenerLyricsDisplaySettings = {
  /** Hide square-bracket annotations (e.g. [Chorus]) at display time. */
  removeBrackets: boolean;
};

export const DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS: ListenerLyricsDisplaySettings = {
  removeBrackets: false,
};

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
  };
}
