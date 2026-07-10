import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_SIDEBAR_LIBRARY_SORT,
  layoutSidebarLibrary,
  mergeSidebarLibraryOrder,
  normalizeSidebarLibraryOrder,
  normalizeSidebarLibrarySort,
  reorderSidebarLibraryOrder,
  SIDEBAR_LIBRARY_ORDER_KEY,
  SIDEBAR_LIBRARY_SORT_KEY,
  splitSidebarLikedEntry,
  toggleSidebarLibrarySort,
  type SidebarLibrarySortColumn,
  type SidebarLibrarySortState,
} from '@shared/listener/sidebarLibraryOrder';
import type { ArtistRow } from '../types/app';
import { getApp } from '../lib/bridge';

/** Manual order, column sort, and derived sidebar rows for the listener library. */
export function useListenerSidebarLibraryLayout(libraryArtists: ArtistRow[]) {
  const [orderIds, setOrderIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SidebarLibrarySortState>(DEFAULT_SIDEBAR_LIBRARY_SORT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    void Promise.all([
      app.getSettings(SIDEBAR_LIBRARY_ORDER_KEY),
      app.getSettings(SIDEBAR_LIBRARY_SORT_KEY),
    ]).then(([orderValue, sortValue]) => {
      if (cancelled) return;
      setOrderIds(normalizeSidebarLibraryOrder(orderValue));
      setSort(normalizeSidebarLibrarySort(sortValue));
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const layout = useMemo(
    () => layoutSidebarLibrary(libraryArtists, orderIds, sort),
    [libraryArtists, orderIds, sort],
  );

  useEffect(() => {
    if (!loaded) return;
    setOrderIds((current) => {
      const { orderIds: synced } = mergeSidebarLibraryOrder(
        splitSidebarLikedEntry(libraryArtists).rest,
        current,
      );
      if (synced.join(',') === current.join(',')) return current;
      void getApp()?.saveSettings(SIDEBAR_LIBRARY_ORDER_KEY, synced);
      return synced;
    });
  }, [libraryArtists, loaded]);

  const persistOrder = useCallback((nextOrderIds: number[]) => {
    setOrderIds(nextOrderIds);
    void getApp()?.saveSettings(SIDEBAR_LIBRARY_ORDER_KEY, nextOrderIds);
  }, []);

  const persistSort = useCallback((nextSort: SidebarLibrarySortState) => {
    setSort(nextSort);
    void getApp()?.saveSettings(SIDEBAR_LIBRARY_SORT_KEY, nextSort);
  }, []);

  const toggleSortColumn = useCallback(
    (column: SidebarLibrarySortColumn) => {
      persistSort(toggleSidebarLibrarySort(sort, column));
    },
    [persistSort, sort],
  );

  const reorderSidebarRows = useCallback(
    (fromIndex: number, toIndex: number) => {
      const nextOrderIds = reorderSidebarLibraryOrder(layout.orderIds, fromIndex, toIndex);
      persistOrder(nextOrderIds);
      persistSort({ column: 'order', direction: 'asc' });
    },
    [layout.orderIds, persistOrder, persistSort],
  );

  const activateManualOrderSort = useCallback(() => {
    persistSort({ column: 'order', direction: 'asc' });
  }, [persistSort]);

  return {
    loaded,
    displayArtists: layout.displayArtists,
    orderNumberById: layout.orderNumberById,
    sortColumn: sort.column,
    sortDirection: sort.direction,
    toggleSortColumn,
    reorderSidebarRows,
    activateManualOrderSort,
  };
}
