/**
 * Host content catalog — read-only (VC window) or full manage mode (designer).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HOST_CONTENT_SETTINGS_KEY,
  migrateHostContentCatalog,
  type HostContentCatalog,
  type HostContentItem,
} from '@shared/hostContent';

import { getApp } from '../lib/bridge';
import { loadHostContentCatalog } from './loadHostContentCatalog';

type UseHostContentCatalogOptions = {
  /** When true, only load catalog — no selection or CRUD helpers. */
  readOnly?: boolean;
};

export function useHostContentCatalog(options: UseHostContentCatalogOptions = {}) {
  const { readOnly = false } = options;
  const [catalog, setCatalog] = useState<HostContentCatalog>(() => migrateHostContentCatalog(null));
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHostContentCatalog().then((next) => {
      if (cancelled) return;
      setCatalog(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
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

  if (readOnly) {
    return {
      catalog,
      ready: !loading,
      loading,
    };
  }

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
