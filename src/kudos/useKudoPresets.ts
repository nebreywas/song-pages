import { useCallback, useEffect, useState } from 'react';

import {
  KUDOS_SETTINGS_KEY,
  migrateKudosState,
  sanitizeKudosStateForSave,
  type KudoPreset,
  type KudoSystemState,
} from '@shared/kudos';

import { getApp } from '../lib/bridge';

export function useKudoPresets() {
  const [state, setState] = useState<KudoSystemState>(() => migrateKudosState(null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getApp()
      ?.getSettings?.(KUDOS_SETTINGS_KEY)
      .then((saved) => {
        if (cancelled) return;
        setState(migrateKudosState(saved));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (updater: (prev: KudoSystemState) => KudoSystemState) => {
    let normalized: KudoSystemState | undefined;
    setState((prev) => {
      normalized = sanitizeKudosStateForSave(updater(prev));
      return normalized;
    });
    if (!normalized) return migrateKudosState(null);
    await getApp()?.saveSettings?.(KUDOS_SETTINGS_KEY, normalized);
    return normalized;
  }, []);

  const savePresets = useCallback(
    async (presets: KudoPreset[] | ((current: KudoPreset[]) => KudoPreset[])) => {
      return persist((prev) => ({
        ...prev,
        presets: typeof presets === 'function' ? presets(prev.presets) : presets,
      }));
    },
    [persist],
  );

  const addPreset = useCallback(
    async (preset: KudoPreset) => {
      return savePresets((current) => [...current, preset]);
    },
    [savePresets],
  );

  const updatePreset = useCallback(
    async (id: string, patch: Partial<KudoPreset>) => {
      const now = Date.now();
      return savePresets((current) =>
        current.map((row) => (row.id === id ? { ...row, ...patch, updatedAt: now } : row)),
      );
    },
    [savePresets],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      return savePresets((current) => current.filter((row) => row.id !== id));
    },
    [savePresets],
  );

  const reorderPresets = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      return savePresets((current) => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= current.length ||
          toIndex >= current.length
        ) {
          return current;
        }
        const next = [...current];
        const [row] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, row!);
        return next;
      });
    },
    [savePresets],
  );

  return {
    presets: state.presets,
    loading,
    savePresets,
    addPreset,
    updatePreset,
    deletePreset,
    reorderPresets,
  };
}
