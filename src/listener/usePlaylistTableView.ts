/**
 * Per-playlist Year↔Plays mode + sort, persisted under ui.listenerPlaylistTableView.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_PLAYLIST_TABLE_VIEW,
  normalizePlaylistTableViewStore,
  playlistTableViewForKey,
  PLAYLIST_TABLE_VIEW_SETTINGS_KEY,
  togglePlaylistYearColumnMode,
  type PlaylistTableSortColumn,
  type PlaylistTableSortDirection,
  type PlaylistTableViewState,
  type PlaylistTableViewStore,
  type PlaylistYearColumnMode,
} from '@shared/listener/playlistTableView';

import { getApp } from '../lib/bridge';

const SAVE_DEBOUNCE_MS = 200;

export function usePlaylistTableView(playlistKey: string | null) {
  const [store, setStore] = useState<PlaylistTableViewStore>({});
  const [view, setView] = useState<PlaylistTableViewState>({ ...DEFAULT_PLAYLIST_TABLE_VIEW });
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    let cancelled = false;
    void getApp()
      ?.getSettings(PLAYLIST_TABLE_VIEW_SETTINGS_KEY)
      .then((raw) => {
        if (cancelled) return;
        const next = normalizePlaylistTableViewStore(raw);
        setStore(next);
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply the saved view whenever the active playlist changes (after hydrate).
  useEffect(() => {
    if (!hydrated) return;
    setView(playlistTableViewForKey(storeRef.current, playlistKey));
  }, [hydrated, playlistKey]);

  const persistStore = useCallback((next: PlaylistTableViewStore) => {
    setStore(next);
    storeRef.current = next;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void getApp()?.saveSettings(PLAYLIST_TABLE_VIEW_SETTINGS_KEY, next);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const commitView = useCallback(
    (next: PlaylistTableViewState) => {
      setView(next);
      if (!playlistKey) return;
      persistStore({ ...storeRef.current, [playlistKey]: next });
    },
    [persistStore, playlistKey],
  );

  const setSortColumn = useCallback(
    (sortColumn: PlaylistTableSortColumn) => {
      commitView({ ...view, sortColumn });
    },
    [commitView, view],
  );

  const setSortDirection = useCallback(
    (sortDirection: PlaylistTableSortDirection) => {
      commitView({ ...view, sortDirection });
    },
    [commitView, view],
  );

  const setSort = useCallback(
    (sortColumn: PlaylistTableSortColumn, sortDirection: PlaylistTableSortDirection) => {
      commitView({ ...view, sortColumn, sortDirection });
    },
    [commitView, view],
  );

  const setYearColumnMode = useCallback(
    (yearColumnMode: PlaylistYearColumnMode) => {
      let sortColumn = view.sortColumn;
      if (yearColumnMode === 'plays' && sortColumn === 'year') sortColumn = 'plays';
      if (yearColumnMode === 'year' && sortColumn === 'plays') sortColumn = 'year';
      commitView({ ...view, yearColumnMode, sortColumn });
    },
    [commitView, view],
  );

  const toggleYearPlaysColumn = useCallback(() => {
    commitView(togglePlaylistYearColumnMode(view));
  }, [commitView, view]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    hydrated,
    yearColumnMode: view.yearColumnMode,
    sortColumn: view.sortColumn,
    sortDirection: view.sortDirection,
    setSortColumn,
    setSortDirection,
    setSort,
    setYearColumnMode,
    toggleYearPlaysColumn,
  };
}
