import { useCallback, useSyncExternalStore } from 'react';

import {
  clampCautionMinutes,
  DEFAULT_PLAYLIST_LENGTH_SETTINGS,
  normalizePlaylistLengthSettings,
  PLAYLIST_LENGTH_SETTINGS_KEY,
  type PlaylistLengthSettings,
} from '@shared/listener/playlistLengthSettings';

import { getApp } from '../lib/bridge';

/** In-memory copy so every hook subscriber sees the same caution threshold. */
let sharedSettings: PlaylistLengthSettings = { ...DEFAULT_PLAYLIST_LENGTH_SETTINGS };
let sharedLoaded = false;
let loadStarted = false;

const listeners = new Set<() => void>();

function emitPlaylistLengthSettingsChange() {
  for (const listener of listeners) listener();
}

function subscribePlaylistLengthSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getPlaylistLengthSettingsSnapshot(): PlaylistLengthSettings {
  return sharedSettings;
}

function getPlaylistLengthSettingsLoadedSnapshot(): boolean {
  return sharedLoaded;
}

function ensurePlaylistLengthSettingsLoaded() {
  if (loadStarted) return;
  loadStarted = true;

  const app = getApp();
  if (!app?.getSettings) {
    sharedLoaded = true;
    emitPlaylistLengthSettingsChange();
    return;
  }

  void app.getSettings(PLAYLIST_LENGTH_SETTINGS_KEY).then((value) => {
    sharedSettings = normalizePlaylistLengthSettings(value);
    sharedLoaded = true;
    emitPlaylistLengthSettingsChange();
  });
}

/** Persisted playlist length caution preferences — synced across App + ListenerMode. */
export function usePlaylistLengthSettings() {
  ensurePlaylistLengthSettingsLoaded();

  const settings = useSyncExternalStore(
    subscribePlaylistLengthSettings,
    getPlaylistLengthSettingsSnapshot,
    getPlaylistLengthSettingsSnapshot,
  );
  const loaded = useSyncExternalStore(
    subscribePlaylistLengthSettings,
    getPlaylistLengthSettingsLoadedSnapshot,
    getPlaylistLengthSettingsLoadedSnapshot,
  );

  const persist = useCallback((next: PlaylistLengthSettings) => {
    sharedSettings = normalizePlaylistLengthSettings(next);
    emitPlaylistLengthSettingsChange();
    void getApp()?.saveSettings(PLAYLIST_LENGTH_SETTINGS_KEY, sharedSettings);
  }, []);

  const setCautionEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...sharedSettings, cautionLongSongsEnabled: enabled });
    },
    [persist],
  );

  const setCautionMinutes = useCallback(
    (minutes: number) => {
      persist({ ...sharedSettings, cautionMinutes: clampCautionMinutes(minutes) });
    },
    [persist],
  );

  return {
    settings,
    loaded,
    persist,
    setCautionEnabled,
    setCautionMinutes,
  };
}
