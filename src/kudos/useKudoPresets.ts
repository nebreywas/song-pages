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

  const persist = useCallback(async (next: KudoSystemState) => {
    const normalized = sanitizeKudosStateForSave(next);
    setState(normalized);
    await getApp()?.saveSettings?.(KUDOS_SETTINGS_KEY, normalized);
    return normalized;
  }, []);

  const savePresets = useCallback(
    async (presets: KudoPreset[]) => {
      return persist({ ...state, presets });
    },
    [persist, state],
  );

  const addPreset = useCallback(
    async (preset: KudoPreset) => {
      return savePresets([...state.presets, preset]);
    },
    [savePresets, state.presets],
  );

  const updatePreset = useCallback(
    async (id: string, patch: Partial<KudoPreset>) => {
      const now = Date.now();
      return savePresets(
        state.presets.map((row) =>
          row.id === id ? { ...row, ...patch, updatedAt: now } : row,
        ),
      );
    },
    [savePresets, state.presets],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      return savePresets(state.presets.filter((row) => row.id !== id));
    },
    [savePresets, state.presets],
  );

  const movePreset = useCallback(
    async (id: string, direction: -1 | 1) => {
      const index = state.presets.findIndex((row) => row.id === id);
      if (index < 0) return state;
      const target = index + direction;
      if (target < 0 || target >= state.presets.length) return state;
      const next = [...state.presets];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return savePresets(next);
    },
    [savePresets, state],
  );

  return {
    presets: state.presets,
    loading,
    savePresets,
    addPreset,
    updatePreset,
    deletePreset,
    movePreset,
  };
}
