import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_LIVE_DEBUG_SETTINGS,
  LIVE_DEBUG_SETTINGS_KEY,
  normalizeLiveDebugSettings,
  toggleLiveDebugEnabled,
  type LiveDebugSettings,
} from '@shared/liveDebug/settings';

import { getApp } from '../lib/bridge';

/** In-memory copy so App + ListenerMode (+ settings) share one toggle in this window. */
let sharedSettings: LiveDebugSettings = { ...DEFAULT_LIVE_DEBUG_SETTINGS };
let sharedLoaded = false;
let loadStarted = false;

const listeners = new Set<() => void>();

function emitLiveDebugSettingsChange() {
  for (const listener of listeners) listener();
}

function subscribeLiveDebugSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getLiveDebugSettingsSnapshot(): LiveDebugSettings {
  return sharedSettings;
}

function getLiveDebugSettingsLoadedSnapshot(): boolean {
  return sharedLoaded;
}

function ensureLiveDebugSettingsLoaded() {
  if (loadStarted) return;
  loadStarted = true;

  const app = getApp();
  if (!app?.getSettings) {
    sharedLoaded = true;
    emitLiveDebugSettingsChange();
    return;
  }

  void app.getSettings(LIVE_DEBUG_SETTINGS_KEY).then((value) => {
    sharedSettings = normalizeLiveDebugSettings(value);
    sharedLoaded = true;
    emitLiveDebugSettingsChange();
  });
}

/** Persisted Live Debug mode — main-window source of truth pushed to VC via state. */
export function useLiveDebugSettings() {
  ensureLiveDebugSettingsLoaded();

  const settings = useSyncExternalStore(
    subscribeLiveDebugSettings,
    getLiveDebugSettingsSnapshot,
    getLiveDebugSettingsSnapshot,
  );
  const loaded = useSyncExternalStore(
    subscribeLiveDebugSettings,
    getLiveDebugSettingsLoadedSnapshot,
    getLiveDebugSettingsLoadedSnapshot,
  );

  const persist = useCallback((next: LiveDebugSettings) => {
    sharedSettings = normalizeLiveDebugSettings(next);
    emitLiveDebugSettingsChange();
    void getApp()?.saveSettings(LIVE_DEBUG_SETTINGS_KEY, sharedSettings);
  }, []);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      persist({ enabled });
    },
    [persist],
  );

  const toggle = useCallback(() => {
    persist(toggleLiveDebugEnabled(sharedSettings));
  }, [persist]);

  return {
    settings,
    enabled: settings.enabled,
    loaded,
    persist,
    setEnabled,
    toggle,
  };
}
