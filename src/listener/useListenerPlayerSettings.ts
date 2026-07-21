import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_LISTENER_PLAYER_SETTINGS,
  LISTENER_PLAYER_SETTINGS_KEY,
  normalizeListenerPlayerSettings,
  toggleSeekTimeDisplay,
  type ListenerPlayerSettings,
} from '@shared/listener/playerSettings';

import { getApp } from '../lib/bridge';

/** Shared so Settings + ListenerMode stay in sync without prop drilling. */
let sharedSettings: ListenerPlayerSettings = { ...DEFAULT_LISTENER_PLAYER_SETTINGS };
let sharedLoaded = false;
let loadStarted = false;

const listeners = new Set<() => void>();

function emitListenerPlayerSettingsChange() {
  for (const listener of listeners) listener();
}

function subscribeListenerPlayerSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getListenerPlayerSettingsSnapshot(): ListenerPlayerSettings {
  return sharedSettings;
}

function getListenerPlayerSettingsLoadedSnapshot(): boolean {
  return sharedLoaded;
}

function ensureListenerPlayerSettingsLoaded() {
  if (loadStarted) return;
  loadStarted = true;

  const app = getApp();
  if (!app?.getSettings) {
    sharedLoaded = true;
    emitListenerPlayerSettingsChange();
    return;
  }

  void app.getSettings(LISTENER_PLAYER_SETTINGS_KEY).then((value) => {
    sharedSettings = normalizeListenerPlayerSettings(value);
    sharedLoaded = true;
    emitListenerPlayerSettingsChange();
  });
}

/** Persisted listener player chrome preferences (seek label, Suno prompts, …). */
export function useListenerPlayerSettings() {
  ensureListenerPlayerSettingsLoaded();

  const settings = useSyncExternalStore(
    subscribeListenerPlayerSettings,
    getListenerPlayerSettingsSnapshot,
    getListenerPlayerSettingsSnapshot,
  );
  const loaded = useSyncExternalStore(
    subscribeListenerPlayerSettings,
    getListenerPlayerSettingsLoadedSnapshot,
    getListenerPlayerSettingsLoadedSnapshot,
  );

  const persist = useCallback((next: ListenerPlayerSettings) => {
    sharedSettings = normalizeListenerPlayerSettings(next);
    emitListenerPlayerSettingsChange();
    void getApp()?.saveSettings(LISTENER_PLAYER_SETTINGS_KEY, sharedSettings);
  }, []);

  const toggleSeekLabel = useCallback(() => {
    const next = {
      ...sharedSettings,
      seekTimeDisplay: toggleSeekTimeDisplay(sharedSettings.seekTimeDisplay),
    };
    persist(next);
  }, [persist]);

  const setZenModeEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...sharedSettings, zenModeEnabled: enabled });
    },
    [persist],
  );

  const toggleZenMode = useCallback(() => {
    setZenModeEnabled(!sharedSettings.zenModeEnabled);
  }, [setZenModeEnabled]);

  const setRadioModeEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...sharedSettings, radioModeEnabled: enabled });
    },
    [persist],
  );

  const toggleRadioMode = useCallback(() => {
    setRadioModeEnabled(!sharedSettings.radioModeEnabled);
  }, [setRadioModeEnabled]);

  const setRadioVoiceId = useCallback(
    (radioVoiceId: ListenerPlayerSettings['radioVoiceId']) => {
      persist({ ...sharedSettings, radioVoiceId });
    },
    [persist],
  );

  return {
    settings,
    loaded,
    persist,
    toggleSeekLabel,
    setZenModeEnabled,
    toggleZenMode,
    setRadioModeEnabled,
    toggleRadioMode,
    setRadioVoiceId,
  };
}
