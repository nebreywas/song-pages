/**
 * Load/save Host Content catalog with auto-persist.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createDefaultHostContentCatalog,
  HOST_CONTENT_SETTINGS_KEY,
  migrateHostContentCatalog,
  type HostContentCatalog,
  type HostContentItem,
} from '@shared/hostContent';

import { getApp } from '../../lib/bridge';

export function useHostContentCatalog() {
  const [catalog, setCatalog] = useState<HostContentCatalog>(() => createDefaultHostContentCatalog());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) {
      setLoading(false);
      return;
    }
    void app
      .getSettings(HOST_CONTENT_SETTINGS_KEY)
      .then((raw) => {
        const next = migrateHostContentCatalog(raw);
        setCatalog(next);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const persist = useCallback(async (next: HostContentCatalog) => {
    const normalized = migrateHostContentCatalog(next);
    setCatalog(normalized);
    await getApp()?.saveSettings?.(HOST_CONTENT_SETTINGS_KEY, normalized);
    return normalized;
  }, []);

  const updateItem = useCallback(
    async (id: string, patch: Partial<HostContentItem>) => {
      const next: HostContentCatalog = {
        ...catalog,
        items: catalog.items.map((item) =>
          item.id === id
            ? ({ ...item, ...patch, updatedAt: new Date().toISOString() } as HostContentItem)
            : item,
        ),
      };
      return persist(next);
    },
    [catalog, persist],
  );

  const replaceCatalog = useCallback(
    (updater: (current: HostContentCatalog) => HostContentCatalog) => {
      void persist(updater(catalog));
    },
    [catalog, persist],
  );

  const selectedItem = useMemo(
    () => catalog.items.find((item) => item.id === selectedId) ?? null,
    [catalog.items, selectedId],
  );

  return {
    catalog,
    loading,
    selectedId,
    selectedItem,
    setSelectedId,
    persist,
    updateItem,
    replaceCatalog,
  };
}
