import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_LISTENER_PLAYER_SETTINGS,
  LISTENER_PLAYER_SETTINGS_KEY,
  normalizeListenerPlayerSettings,
  toggleSeekTimeDisplay,
  type ListenerPlayerSettings,
} from '@shared/listener/playerSettings';

import { getApp } from '../lib/bridge';

/** Persisted listener player chrome preferences (seek label, future options). */
export function useListenerPlayerSettings() {
  const [settings, setSettings] = useState<ListenerPlayerSettings>(DEFAULT_LISTENER_PLAYER_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    void app.getSettings(LISTENER_PLAYER_SETTINGS_KEY).then((value) => {
      if (cancelled) return;
      setSettings(normalizeListenerPlayerSettings(value));
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: ListenerPlayerSettings) => {
    setSettings(next);
    void getApp()?.saveSettings(LISTENER_PLAYER_SETTINGS_KEY, next);
  }, []);

  const toggleSeekLabel = useCallback(() => {
    setSettings((current) => {
      const next = {
        ...current,
        seekTimeDisplay: toggleSeekTimeDisplay(current.seekTimeDisplay),
      };
      void getApp()?.saveSettings(LISTENER_PLAYER_SETTINGS_KEY, next);
      return next;
    });
  }, []);

  return { settings, loaded, persist, toggleSeekLabel };
}
