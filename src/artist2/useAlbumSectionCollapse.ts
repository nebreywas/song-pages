/**
 * Loads / saves per-album Album Editor section collapse flags via SQLite settings.
 * Defaults to expanded when a flag is missing so first-open stays readable.
 *
 * If the author toggles before the settings read returns, we keep those toggles
 * and merge them into the loaded store before the first write — so other albums’
 * flags are never wiped.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizeAlbumSectionCollapseStore,
  setAlbumSectionCollapsed,
  albumSectionIsCollapsed,
  ALBUM_SECTION_COLLAPSE_SETTINGS_KEY,
  type AlbumEditorSectionId,
  type AlbumSectionCollapseFlags,
  type AlbumSectionCollapseStore,
} from '@shared/artist2';

import { getApp } from '../lib/bridge';

export function useAlbumSectionCollapse(albumId: string) {
  const [flags, setFlags] = useState<AlbumSectionCollapseFlags>({});
  const storeRef = useRef<AlbumSectionCollapseStore>({});
  const albumIdRef = useRef(albumId);
  const loadedRef = useRef(false);
  // Local toggles made before the settings blob finished loading.
  const pendingRef = useRef<AlbumSectionCollapseFlags | null>(null);
  albumIdRef.current = albumId;

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

    void app.getSettings(ALBUM_SECTION_COLLAPSE_SETTINGS_KEY).then((raw) => {
      if (cancelled) return;
      let store = normalizeAlbumSectionCollapseStore(raw);
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending && Object.keys(pending).length > 0) {
        // Layer pre-load toggles onto disk so other albums / sections stay intact.
        for (const [sectionId, collapsed] of Object.entries(pending)) {
          store = setAlbumSectionCollapsed(
            store,
            albumId,
            sectionId as AlbumEditorSectionId,
            collapsed,
          );
        }
        void app.saveSettings?.(ALBUM_SECTION_COLLAPSE_SETTINGS_KEY, store);
      }
      storeRef.current = store;
      setFlags(store[albumId] ?? {});
      loadedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const isCollapsed = useCallback(
    (sectionId: AlbumEditorSectionId) => albumSectionIsCollapsed(flags, sectionId),
    [flags],
  );

  const toggle = useCallback((sectionId: AlbumEditorSectionId) => {
    const id = albumIdRef.current;
    const baseFlags = loadedRef.current
      ? (storeRef.current[id] ?? {})
      : (pendingRef.current ?? storeRef.current[id] ?? {});
    const nextCollapsed = !albumSectionIsCollapsed(baseFlags, sectionId);

    if (!loadedRef.current) {
      // Defer the disk write until load finishes so we can merge with other albums.
      const nextPending =
        setAlbumSectionCollapsed({ [id]: baseFlags }, id, sectionId, nextCollapsed)[id] ?? {};
      pendingRef.current = nextPending;
      setFlags(nextPending);
      return;
    }

    const nextStore = setAlbumSectionCollapsed(storeRef.current, id, sectionId, nextCollapsed);
    storeRef.current = nextStore;
    setFlags(nextStore[id] ?? {});

    const app = getApp();
    if (!app?.saveSettings) return;
    void app.saveSettings(ALBUM_SECTION_COLLAPSE_SETTINGS_KEY, nextStore);
  }, []);

  return { isCollapsed, toggle };
}
