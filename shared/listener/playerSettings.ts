export const LISTENER_PLAYER_SETTINGS_KEY = 'ui.listenerPlayer';

export type SeekTimeDisplay = 'remaining' | 'duration';

export type ListenerPlayerSettings = {
  /** Right seek label — countdown remaining or total track length. */
  seekTimeDisplay: SeekTimeDisplay;
};

export const DEFAULT_LISTENER_PLAYER_SETTINGS: ListenerPlayerSettings = {
  seekTimeDisplay: 'remaining',
};

/** Normalize persisted listener player UI preferences. */
export function normalizeListenerPlayerSettings(raw: unknown): ListenerPlayerSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LISTENER_PLAYER_SETTINGS };
  }
  const value = raw as Partial<ListenerPlayerSettings>;
  return {
    seekTimeDisplay: value.seekTimeDisplay === 'duration' ? 'duration' : 'remaining',
  };
}

export function toggleSeekTimeDisplay(current: SeekTimeDisplay): SeekTimeDisplay {
  return current === 'remaining' ? 'duration' : 'remaining';
}
