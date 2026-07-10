/**
 * Debounced auto-persist for VC surface config — mirrors Host Content catalog behavior.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { normalizeVcConfig, type VcModeConfig } from '@shared/vcModeTypes';

import { persistVcModeConfig } from './vcSurfaceDesignStore';

const AUTOSAVE_DEBOUNCE_MS = 500;

export type VcConfigSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type UseAutoSaveVcConfigOptions = {
  enabled: boolean;
  config: VcModeConfig;
};

export function useAutoSaveVcConfig({ enabled, config }: UseAutoSaveVcConfigOptions) {
  const [saveStatus, setSaveStatus] = useState<VcConfigSaveStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const savedFadeTimerRef = useRef<number | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const clearSavedFadeTimer = useCallback(() => {
    if (savedFadeTimerRef.current != null) {
      window.clearTimeout(savedFadeTimerRef.current);
      savedFadeTimerRef.current = null;
    }
  }, []);

  const persistNow = useCallback(async (next: VcModeConfig): Promise<boolean> => {
    const normalized = normalizeVcConfig(next);
    setSaveStatus('saving');
    try {
      const saved = await persistVcModeConfig(normalized);
      if (!saved) throw new Error('persist failed');
      setSaveStatus('saved');
      clearSavedFadeTimer();
      savedFadeTimerRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
      return true;
    } catch {
      setSaveStatus('error');
      return false;
    }
  }, [clearSavedFadeTimer]);

  /** Call after loading persisted config when the designer opens. */
  const markHydrated = useCallback(() => {
    setIsHydrated(true);
    setSaveStatus('idle');
  }, []);

  /** Reset when the modal closes so the next open does not save the initial load. */
  const resetHydration = useCallback(() => {
    setIsHydrated(false);
    clearSaveTimer();
    clearSavedFadeTimer();
    setSaveStatus('idle');
  }, [clearSaveTimer, clearSavedFadeTimer]);

  useEffect(() => {
    if (!enabled || !isHydrated) return;

    setSaveStatus((current) => (current === 'saving' ? current : 'pending'));
    clearSaveTimer();
    saveTimerRef.current = window.setTimeout(() => {
      void persistNow(configRef.current);
    }, AUTOSAVE_DEBOUNCE_MS);

    return clearSaveTimer;
  }, [enabled, isHydrated, config, persistNow, clearSaveTimer]);

  /** Flush any pending debounced save (e.g. before Start VC). */
  const flushSave = useCallback(async (): Promise<boolean> => {
    if (!isHydrated) return true;
    clearSaveTimer();
    return persistNow(configRef.current);
  }, [clearSaveTimer, isHydrated, persistNow]);

  return {
    saveStatus,
    isHydrated,
    markHydrated,
    resetHydration,
    flushSave,
  };
}

export function vcConfigSaveStatusLabel(status: VcConfigSaveStatus): string | null {
  switch (status) {
    case 'pending':
      return 'Unsaved changes…';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'All changes saved';
    case 'error':
      return 'Could not save — try again';
    default:
      return null;
  }
}
