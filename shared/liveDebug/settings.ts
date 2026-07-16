/**
 * App-wide Live Debug mode — realtime HUD for hosts diagnosing live systems
 * (ALARE trim/speed, and more sections later).
 */

export const LIVE_DEBUG_SETTINGS_KEY = 'ui.liveDebug';

export type LiveDebugSettings = {
  /** When true, show the Live Debug HUD on surfaces that publish sections. */
  enabled: boolean;
};

export const DEFAULT_LIVE_DEBUG_SETTINGS: LiveDebugSettings = {
  enabled: false,
};

/** Normalize persisted Live Debug preferences. */
export function normalizeLiveDebugSettings(raw: unknown): LiveDebugSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LIVE_DEBUG_SETTINGS };
  }
  const value = raw as Partial<LiveDebugSettings>;
  return {
    enabled: value.enabled === true,
  };
}

export function toggleLiveDebugEnabled(current: LiveDebugSettings): LiveDebugSettings {
  return { enabled: !current.enabled };
}
