import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  LISTENER_LYRICS_DISPLAY_SETTINGS_KEY,
  normalizeListenerLyricsDisplaySettings,
  type ListenerLyricsDisplaySettings,
} from '@shared/listener/lyricsDisplaySettings';

import { getApp } from '../lib/bridge';

/** Persisted listener lyrics display preferences (bracket strip, future options). */
export function useListenerLyricsDisplaySettings() {
  const [settings, setSettings] = useState<ListenerLyricsDisplaySettings>(
    DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    void app.getSettings(LISTENER_LYRICS_DISPLAY_SETTINGS_KEY).then((value) => {
      if (cancelled) return;
      setSettings(normalizeListenerLyricsDisplaySettings(value));
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: ListenerLyricsDisplaySettings) => {
    setSettings(next);
    void getApp()?.saveSettings(LISTENER_LYRICS_DISPLAY_SETTINGS_KEY, next);
  }, []);

  const setRemoveBrackets = useCallback(
    (removeBrackets: boolean) => {
      setSettings((current) => {
        const next = { ...current, removeBrackets };
        void getApp()?.saveSettings(LISTENER_LYRICS_DISPLAY_SETTINGS_KEY, next);
        return next;
      });
    },
    [],
  );

  return { settings, loaded, persist, setRemoveBrackets };
};
