/**
 * Loads / saves per-playlist Playlist Editor section collapse flags via SQLite settings.
 * Defaults to expanded when a flag is missing so first-open stays readable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizePlaylistSectionCollapseStore,
  setPlaylistSectionCollapsed,
  playlistSectionIsCollapsed,
  PLAYLIST_SECTION_COLLAPSE_SETTINGS_KEY,
  type PlaylistEditorSectionId,
  type PlaylistSectionCollapseFlags,
  type PlaylistSectionCollapseStore,
} from '@shared/artist2';

import { getApp } from '../lib/bridge';

export function usePlaylistSectionCollapse(playlistId: string) {
  const [flags, setFlags] = useState<PlaylistSectionCollapseFlags>({});
  const storeRef = useRef<PlaylistSectionCollapseStore>({});
  const playlistIdRef = useRef(playlistId);
  const loadedRef = useRef(false);
  const pendingRef = useRef<PlaylistSectionCollapseFlags | null>(null);
  playlistIdRef.current = playlistId;

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    pendingRef.current = null;
    setFlags({});
    storeRef.current = {};

    const app = getApp();
    if (!app?.getSettings) {
      loadedRef.current = true;
      return;
    }

    void app.getSettings(PLAYLIST_SECTION_COLLAPSE_SETTINGS_KEY).then((raw) => {
      if (cancelled) return;
      let store = normalizePlaylistSectionCollapseStore(raw);
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending && Object.keys(pending).length > 0) {
        for (const [sectionId, collapsed] of Object.entries(pending)) {
          store = setPlaylistSectionCollapsed(
            store,
            playlistId,
            sectionId as PlaylistEditorSectionId,
            collapsed,
          );
        }
        void app.saveSettings?.(PLAYLIST_SECTION_COLLAPSE_SETTINGS_KEY, store);
      }
      storeRef.current = store;
      setFlags(store[playlistId] ?? {});
      loadedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const isCollapsed = useCallback(
    (sectionId: PlaylistEditorSectionId) => playlistSectionIsCollapsed(flags, sectionId),
    [flags],
  );

  const toggle = useCallback((sectionId: PlaylistEditorSectionId) => {
    const id = playlistIdRef.current;
    const baseFlags = loadedRef.current
      ? (storeRef.current[id] ?? {})
      : (pendingRef.current ?? storeRef.current[id] ?? {});
    const nextCollapsed = !playlistSectionIsCollapsed(baseFlags, sectionId);

    if (!loadedRef.current) {
      const nextPending =
        setPlaylistSectionCollapsed({ [id]: baseFlags }, id, sectionId, nextCollapsed)[id] ?? {};
      pendingRef.current = nextPending;
      setFlags(nextPending);
      return;
    }

    const nextStore = setPlaylistSectionCollapsed(storeRef.current, id, sectionId, nextCollapsed);
    storeRef.current = nextStore;
    setFlags(nextStore[id] ?? {});

    const app = getApp();
    if (!app?.saveSettings) return;
    void app.saveSettings(PLAYLIST_SECTION_COLLAPSE_SETTINGS_KEY, nextStore);
  }, []);

  return { isCollapsed, toggle };
}
