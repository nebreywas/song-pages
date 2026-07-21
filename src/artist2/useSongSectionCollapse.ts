/**
 * Loads / saves per-song Song Editor section collapse flags via SQLite settings.
 * Defaults to expanded when a flag is missing so first-open stays readable.
 *
 * If the author toggles before the settings read returns, we keep those toggles
 * and merge them into the loaded store before the first write — so other songs’
 * flags are never wiped.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizeSongSectionCollapseStore,
  setSongSectionCollapsed,
  songSectionIsCollapsed,
  SONG_SECTION_COLLAPSE_SETTINGS_KEY,
  type SongEditorSectionId,
  type SongSectionCollapseFlags,
  type SongSectionCollapseStore,
} from '@shared/artist2';

import { getApp } from '../lib/bridge';

export function useSongSectionCollapse(songId: string) {
  const [flags, setFlags] = useState<SongSectionCollapseFlags>({});
  const storeRef = useRef<SongSectionCollapseStore>({});
  const songIdRef = useRef(songId);
  const loadedRef = useRef(false);
  // Local toggles made before the settings blob finished loading.
  const pendingRef = useRef<SongSectionCollapseFlags | null>(null);
  songIdRef.current = songId;

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

    void app.getSettings(SONG_SECTION_COLLAPSE_SETTINGS_KEY).then((raw) => {
      if (cancelled) return;
      let store = normalizeSongSectionCollapseStore(raw);
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending && Object.keys(pending).length > 0) {
        // Layer pre-load toggles onto disk so other songs / sections stay intact.
        for (const [sectionId, collapsed] of Object.entries(pending)) {
          store = setSongSectionCollapsed(
            store,
            songId,
            sectionId as SongEditorSectionId,
            collapsed,
          );
        }
        void app.saveSettings?.(SONG_SECTION_COLLAPSE_SETTINGS_KEY, store);
      }
      storeRef.current = store;
      setFlags(store[songId] ?? {});
      loadedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [songId]);

  const isCollapsed = useCallback(
    (sectionId: SongEditorSectionId) => songSectionIsCollapsed(flags, sectionId),
    [flags],
  );

  const toggle = useCallback((sectionId: SongEditorSectionId) => {
    const id = songIdRef.current;
    const baseFlags = loadedRef.current
      ? (storeRef.current[id] ?? {})
      : (pendingRef.current ?? storeRef.current[id] ?? {});
    const nextCollapsed = !songSectionIsCollapsed(baseFlags, sectionId);

    if (!loadedRef.current) {
      // Defer the disk write until load finishes so we can merge with other songs.
      const nextPending = setSongSectionCollapsed({ [id]: baseFlags }, id, sectionId, nextCollapsed)[
        id
      ] ?? {};
      pendingRef.current = nextPending;
      setFlags(nextPending);
      return;
    }

    const nextStore = setSongSectionCollapsed(storeRef.current, id, sectionId, nextCollapsed);
    storeRef.current = nextStore;
    setFlags(nextStore[id] ?? {});

    const app = getApp();
    if (!app?.saveSettings) return;
    void app.saveSettings(SONG_SECTION_COLLAPSE_SETTINGS_KEY, nextStore);
  }, []);

  return { isCollapsed, toggle };
}
