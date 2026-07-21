/**
 * Artist 2.0 catalog state — loads/persists via main-process SQLite + JSON payloads.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  Artist2AlbumDetail,
  Artist2AlbumTrackSummaries,
  Artist2Artist,
  Artist2CatalogKind,
  Artist2CatalogObject,
  Artist2ContentType,
  Artist2DeleteImpact,
  Artist2DeletionReport,
  Artist2EditorSelection,
  Artist2LibraryFilter,
} from '@shared/artist2';
import { ARTIST2_LIBRARY_FILTER_ALL } from '@shared/artist2';

import { getApp } from '../lib/bridge';
import { filterCatalogObjects, patchSongNameInSummaries } from './catalogSidebarUtils';

type Artist2ApiResult<T> = { ok: boolean; data?: T; error?: string };

function artist2() {
  return getApp()?.artist2;
}

async function unwrap<T>(promise: Promise<Artist2ApiResult<T>> | undefined, fallback: T): Promise<T> {
  if (!promise) return fallback;
  const result = await promise;
  if (!result.ok) {
    throw new Error(result.error || 'Artist 2.0 request failed.');
  }
  return (result.data ?? fallback) as T;
}

/** Non-fatal loads (e.g. sidebar summaries) must not hide the whole catalog. */
async function unwrapOptional<T>(
  promise: Promise<Artist2ApiResult<T>> | undefined,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await unwrap(promise, fallback);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[artist2] ${label} unavailable:`, message);
    return fallback;
  }
}

function isStaleMainProcessError(message: string): boolean {
  return (
    message.includes('No handler registered for') ||
    message.includes('Electron main process is out of date') ||
    message.includes('is not a function')
  );
}

const STALE_ELECTRON_MESSAGE =
  'Electron main process is out of date. Fully quit Song Pages (Cmd+Q) and run npm run dev again.';

/** Preload only loads at window creation — missing methods mean a full restart is required. */
function requireArtist2Method<K extends keyof NonNullable<ReturnType<typeof artist2>>>(
  method: K,
): NonNullable<NonNullable<ReturnType<typeof artist2>>[K]> {
  const api = artist2();
  const fn = api?.[method];
  if (typeof fn !== 'function') {
    throw new Error(STALE_ELECTRON_MESSAGE);
  }
  return fn as NonNullable<NonNullable<ReturnType<typeof artist2>>[K]>;
}

export function useArtist2Catalog() {
  const [artists, setArtists] = useState<Artist2Artist[]>([]);
  const [activeArtistId, setActiveArtistId] = useState<string | null>(null);
  const [objects, setObjects] = useState<Artist2CatalogObject[]>([]);
  const [membershipCounts, setMembershipCounts] = useState<Record<string, number>>({});
  const [albumTrackSummaries, setAlbumTrackSummaries] = useState<Artist2AlbumTrackSummaries>({});
  const [selection, setSelection] = useState<Artist2EditorSelection>({ type: 'artist' });
  const [albumDetail, setAlbumDetail] = useState<Artist2AlbumDetail | null>(null);
  const [filter, setFilter] = useState<Artist2LibraryFilter>(() => ({
    ...ARTIST2_LIBRARY_FILTER_ALL,
  }));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devWarning, setDevWarning] = useState<string | null>(null);
  const [deletedObjects, setDeletedObjects] = useState<Artist2CatalogObject[]>([]);
  const [deletionReports, setDeletionReports] = useState<Artist2DeletionReport[]>([]);
  const [deletedPanelLoading, setDeletedPanelLoading] = useState(false);

  const refreshArtists = useCallback(async () => {
    const list = await unwrap(artist2()?.listArtists(), [] as Artist2Artist[]);
    setArtists(list);
    return list;
  }, []);

  // Always load the full catalog — kind filter + search narrow the sidebar
  // client-side so search runs within the active filter, not instead of it.
  const refreshObjects = useCallback(async (artistId: string) => {
    const list = await unwrap(
      artist2()?.listObjects(artistId),
      [] as Artist2CatalogObject[],
    );
    setObjects(list);

    const counts = await unwrapOptional(
      artist2()?.listMembershipCounts(artistId),
      {} as Record<string, number>,
      'membership counts',
    );
    setMembershipCounts(counts);

    const summaries = await unwrapOptional(
      artist2()?.listAlbumTrackSummaries(artistId),
      {} as Artist2AlbumTrackSummaries,
      'album track summaries',
    );
    setAlbumTrackSummaries(summaries);

    return list;
  }, []);

  /** Refresh sidebar-only indexes (nested album tracks, counts) without reloading the object list. */
  const refreshSidebarIndexes = useCallback(async (artistId: string) => {
    const [counts, summaries] = await Promise.all([
      unwrapOptional(
        artist2()?.listMembershipCounts(artistId),
        {} as Record<string, number>,
        'membership counts',
      ),
      unwrapOptional(
        artist2()?.listAlbumTrackSummaries(artistId),
        {} as Artist2AlbumTrackSummaries,
        'album track summaries',
      ),
    ]);
    setMembershipCounts(counts);
    setAlbumTrackSummaries(summaries);
  }, []);

  const applyObjectToSidebar = useCallback((updated: Artist2CatalogObject) => {
    setObjects((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));

    if (updated.kind === 'song') {
      setAlbumTrackSummaries((prev) => patchSongNameInSummaries(prev, updated.id, updated.name));
      setAlbumDetail((prev) => {
        if (!prev || !prev.tracks.some((track) => track.id === updated.id)) return prev;
        return {
          ...prev,
          tracks: prev.tracks.map((track) => (track.id === updated.id ? updated : track)),
        };
      });
    }

    if (updated.kind === 'album' || updated.kind === 'playlist') {
      setAlbumDetail((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
    }
  }, []);

  const refreshSelection = useCallback(async (next: Artist2EditorSelection) => {
    if (next.type !== 'object') {
      setAlbumDetail(null);
      return;
    }
    const obj = objects.find((row) => row.id === next.id) ?? null;
    if (obj?.kind === 'album' || obj?.kind === 'playlist') {
      const detail = await unwrap(
        artist2()?.getAlbumDetail(next.id),
        null as Artist2AlbumDetail | null,
      );
      setAlbumDetail(detail);
    } else {
      setAlbumDetail(null);
    }
  }, [objects]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await refreshArtists();
        if (cancelled) return;
        if (list.length > 0) {
          setActiveArtistId((current) => current ?? list[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshArtists]);

  useEffect(() => {
    if (!activeArtistId) {
      setObjects([]);
      setAlbumTrackSummaries({});
      return;
    }
    setSelection({ type: 'artist' });
    let cancelled = false;
    void (async () => {
      try {
        await refreshObjects(activeArtistId);
        if (!cancelled) {
          setError(null);
          setDevWarning(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          if (isStaleMainProcessError(message)) {
            setDevWarning(STALE_ELECTRON_MESSAGE);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeArtistId, refreshObjects]);

  useEffect(() => {
    void refreshSelection(selection);
  }, [selection, objects, refreshSelection]);

  const activeArtist = useMemo(
    () => artists.find((artist) => artist.id === activeArtistId) ?? null,
    [artists, activeArtistId],
  );

  const selected = useMemo(() => {
    if (selection.type !== 'object') return null;
    return objects.find((row) => row.id === selection.id) ?? null;
  }, [objects, selection]);

  const filteredObjects = useMemo(() => {
    // Sidebar owns the visible list; this mirror stays for callers that still
    // read `objects` and expect the active kind filter + search to be applied.
    return filterCatalogObjects(objects, filter, search);
  }, [objects, filter, search]);

  const trackCounts = useMemo(() => {
    const counts = new Map<string, number>(Object.entries(membershipCounts));
    if (albumDetail) {
      counts.set(albumDetail.id, albumDetail.tracks.length);
    }
    return counts;
  }, [membershipCounts, albumDetail]);

  const contentById = useMemo(() => {
    const map = new Map<string, Artist2CatalogObject>();
    for (const row of objects) {
      if (row.kind === 'content') map.set(row.id, row);
    }
    return map;
  }, [objects]);

  const refreshDeletedPanel = useCallback(async (artistId: string) => {
    setDeletedPanelLoading(true);
    try {
      const [deleted, reports] = await Promise.all([
        unwrapOptional(
          artist2()?.listDeletedObjects(artistId),
          [] as Artist2CatalogObject[],
          'deleted objects',
        ),
        unwrapOptional(
          artist2()?.listDeletionReports(artistId),
          [] as Artist2DeletionReport[],
          'deletion reports',
        ),
      ]);
      setDeletedObjects(deleted);
      setDeletionReports(reports);
    } finally {
      setDeletedPanelLoading(false);
    }
  }, []);

  const getDeleteImpact = useCallback(async (id: string) => {
    return unwrap(artist2()?.getDeleteImpact(id), null as Artist2DeleteImpact | null);
  }, []);

  const createArtist = useCallback(
    async (name: string) => {
      const artist = await unwrap(artist2()?.createArtist({ name }), null as Artist2Artist | null);
      if (!artist) return null;
      await refreshArtists();
      setActiveArtistId(artist.id);
      setSelection({ type: 'artist' });
      return artist;
    },
    [refreshArtists],
  );

  const updateArtist = useCallback(
    async (patch: { name?: string; payload?: Record<string, unknown> }) => {
      if (!activeArtistId) return null;
      const updated = await unwrap(
        artist2()?.updateArtist(activeArtistId, patch),
        null as Artist2Artist | null,
      );
      if (updated) {
        setArtists((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      }
      return updated;
    },
    [activeArtistId],
  );

  const createObject = useCallback(
    async (input: {
      kind: Artist2CatalogKind;
      contentType?: Artist2ContentType | null;
      name: string;
    }) => {
      if (!activeArtistId) throw new Error('Create an Artist first.');
      const created = await unwrap(
        artist2()?.createObject({
          artistId: activeArtistId,
          kind: input.kind,
          contentType: input.contentType ?? null,
          name: input.name,
        }),
        null as Artist2CatalogObject | null,
      );
      if (!created) return null;
      await refreshObjects(activeArtistId);
      setSelection({ type: 'object', id: created.id });
      return created;
    },
    [activeArtistId, refreshObjects],
  );

  const updateObject = useCallback(
    async (
      id: string,
      patch: { name?: string; status?: 'draft' | 'ready'; payload?: Record<string, unknown> },
    ) => {
      const updated = await unwrap(
        artist2()?.updateObject(id, patch),
        null as Artist2CatalogObject | null,
      );
      if (updated) {
        applyObjectToSidebar(updated);

        if (
          (updated.kind === 'album' || updated.kind === 'playlist') &&
          selection.type === 'object' &&
          selection.id === updated.id
        ) {
          const detail = await unwrap(
            artist2()?.getAlbumDetail(updated.id),
            null as Artist2AlbumDetail | null,
          );
          setAlbumDetail(detail);
        }

        if (activeArtistId) {
          void refreshSidebarIndexes(activeArtistId);
        }
      }
      return updated;
    },
    [activeArtistId, applyObjectToSidebar, refreshSidebarIndexes, selection],
  );

  const deleteObject = useCallback(
    async (id: string) => {
      const result = await unwrap(artist2()?.deleteObject(id), {
        ok: true,
        deleted: false,
        reportId: null,
      });
      if (selection.type === 'object' && selection.id === id) {
        setSelection({ type: 'artist' });
      }
      if (activeArtistId) {
        await refreshObjects(activeArtistId);
        void refreshDeletedPanel(activeArtistId);
      }
      return result;
    },
    [activeArtistId, refreshDeletedPanel, refreshObjects, selection],
  );

  const restoreObject = useCallback(
    async (id: string) => {
      const restored = await unwrap(
        artist2()?.restoreObject(id),
        null as Artist2CatalogObject | null,
      );
      if (activeArtistId) {
        await refreshObjects(activeArtistId);
        await refreshDeletedPanel(activeArtistId);
      }
      return restored;
    },
    [activeArtistId, refreshDeletedPanel, refreshObjects],
  );

  const clearDeletionReport = useCallback(
    async (reportId: string) => {
      await unwrap(artist2()?.clearDeletionReport(reportId), { ok: true, cleared: false });
      if (activeArtistId) await refreshDeletedPanel(activeArtistId);
    },
    [activeArtistId, refreshDeletedPanel],
  );

  const clearAllDeletionReports = useCallback(async () => {
    if (!activeArtistId) return;
    await unwrap(artist2()?.clearAllDeletionReports(activeArtistId), {
      ok: true,
      clearedCount: 0,
    });
    await refreshDeletedPanel(activeArtistId);
  }, [activeArtistId, refreshDeletedPanel]);

  const compileCatalog = useCallback(async (artistId: string) => {
    return unwrap(artist2()?.compile(artistId), null as {
      slug: string;
      previewUrl: string;
      outputFolder: string;
      songCount: number;
      buildVersion: string;
      generatedAt: string;
      warnings: string[];
      skippedSongs: Array<{ id: string; name: string; reason: string }>;
    } | null);
  }, []);

  const getCompilePreview = useCallback(async (artistId: string) => {
    return unwrap(
      artist2()?.getCompilePreview(artistId),
      null as import('@shared/artist2').Artist2CompileBuildResult | null,
    );
  }, []);

  const importSunoIntoSong = useCallback(
    async (objectId: string, rawInput: string) => {
      const importFn = requireArtist2Method('importSunoIntoSong');
      const result = await unwrap(
        importFn(objectId, rawInput),
        null as {
          object: Artist2CatalogObject;
          coverImported: boolean;
          coverWarning: string | null;
          clipId: string;
        } | null,
      );
      if (result?.object) {
        applyObjectToSidebar(result.object);
        if (activeArtistId) {
          void refreshSidebarIndexes(activeArtistId);
        }
      }
      return result;
    },
    [activeArtistId, applyObjectToSidebar, refreshSidebarIndexes],
  );

  const renameCoverForObject = useCallback(
    async (objectId: string) => {
      const renameFn = requireArtist2Method('renameCoverForObject');
      const result = await unwrap(
        renameFn(objectId),
        null as {
          object: Artist2CatalogObject;
          content: Artist2CatalogObject | null;
          path: string;
          renamed: boolean;
          filename: string;
        } | null,
      );
      if (result?.object) {
        applyObjectToSidebar(result.object);
      }
      if (result?.content) {
        applyObjectToSidebar(result.content);
      }
      if (activeArtistId) {
        void refreshSidebarIndexes(activeArtistId);
      }
      return result;
    },
    [activeArtistId, applyObjectToSidebar, refreshSidebarIndexes],
  );

  const insertSongIntoAlbum = useCallback(
    async (albumId: string, songId: string) => {
      const detail = await unwrap(
        artist2()?.addMembership({ containerId: albumId, memberId: songId }),
        null as Artist2AlbumDetail | null,
      );
      setAlbumDetail(detail);
      if (activeArtistId) await refreshObjects(activeArtistId);
      return detail;
    },
    [activeArtistId, refreshObjects],
  );

  const removeTrack = useCallback(
    async (membershipId: string) => {
      const detail = await unwrap(
        artist2()?.removeMembership(membershipId),
        null as Artist2AlbumDetail | null,
      );
      setAlbumDetail(detail);
      if (activeArtistId) await refreshObjects(activeArtistId);
      return detail;
    },
    [activeArtistId, refreshObjects],
  );

  const moveTrack = useCallback(
    async (albumId: string, memberId: string, direction: -1 | 1) => {
      if (!albumDetail || albumDetail.id !== albumId) return null;
      const ids = albumDetail.tracks.map((t) => t.id);
      const index = ids.indexOf(memberId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= ids.length) return albumDetail;
      const reordered = [...ids];
      const [item] = reordered.splice(index, 1);
      reordered.splice(next, 0, item);
      const detail = await unwrap(
        artist2()?.reorderMemberships(albumId, reordered),
        null as Artist2AlbumDetail | null,
      );
      setAlbumDetail(detail);
      if (activeArtistId) await refreshObjects(activeArtistId);
      return detail;
    },
    [albumDetail, activeArtistId, refreshObjects],
  );

  const promoteArtwork = useCallback(
    async (objectId: string, name?: string) => {
      const result = await unwrap(
        artist2()?.promoteArtwork({ objectId, name }),
        null as {
          object: Artist2CatalogObject;
          content: Artist2CatalogObject;
        } | null,
      );
      if (result) {
        applyObjectToSidebar(result.object);
        applyObjectToSidebar(result.content);
      }
      if (activeArtistId) {
        await refreshObjects(activeArtistId);
        void refreshSidebarIndexes(activeArtistId);
      }
      if (result && selection.type === 'object' && selection.id === objectId) {
        setSelection({ type: 'object', id: objectId });
      }
      return result;
    },
    [activeArtistId, applyObjectToSidebar, refreshObjects, refreshSidebarIndexes, selection],
  );

  const linkRelatedSongs = useCallback(
    async (payload: {
      fromSongId: string;
      toSongId: string;
      relation?: import('@shared/artist2').Artist2SongRelationKind;
      note?: string;
    }) => {
      const linkFn = requireArtist2Method('linkRelatedSongs');
      const result = await unwrap(
        linkFn(payload),
        null as {
          from: Artist2CatalogObject;
          to: Artist2CatalogObject;
        } | null,
      );
      if (result?.from) applyObjectToSidebar(result.from);
      if (result?.to) applyObjectToSidebar(result.to);
      return result;
    },
    [applyObjectToSidebar],
  );

  const unlinkRelatedSongs = useCallback(
    async (fromSongId: string, toSongId: string) => {
      const unlinkFn = requireArtist2Method('unlinkRelatedSongs');
      const result = await unwrap(
        unlinkFn({ fromSongId, toSongId }),
        null as {
          from: Artist2CatalogObject;
          to: Artist2CatalogObject | null;
        } | null,
      );
      if (result?.from) applyObjectToSidebar(result.from);
      if (result?.to) applyObjectToSidebar(result.to);
      return result;
    },
    [applyObjectToSidebar],
  );

  const linkRelatedAlbums = useCallback(
    async (payload: {
      fromAlbumId: string;
      toAlbumId: string;
      relation?: import('@shared/artist2').Artist2AlbumRelationKind;
      note?: string;
    }) => {
      const linkFn = requireArtist2Method('linkRelatedAlbums');
      const result = await unwrap(
        linkFn(payload),
        null as {
          from: Artist2CatalogObject;
          to: Artist2CatalogObject;
        } | null,
      );
      if (result?.from) applyObjectToSidebar(result.from);
      if (result?.to) applyObjectToSidebar(result.to);
      return result;
    },
    [applyObjectToSidebar],
  );

  const unlinkRelatedAlbums = useCallback(
    async (fromAlbumId: string, toAlbumId: string) => {
      const unlinkFn = requireArtist2Method('unlinkRelatedAlbums');
      const result = await unwrap(
        unlinkFn({ fromAlbumId, toAlbumId }),
        null as {
          from: Artist2CatalogObject;
          to: Artist2CatalogObject | null;
        } | null,
      );
      if (result?.from) applyObjectToSidebar(result.from);
      if (result?.to) applyObjectToSidebar(result.to);
      return result;
    },
    [applyObjectToSidebar],
  );

  const repairBrokenReference = useCallback(
    async (reportId: string, refIndex: number) => {
      const repairFn = requireArtist2Method('repairBrokenReference');
      const result = await unwrap(
        repairFn({ reportId, refIndex }),
        null as { repaired: boolean; kind: string; detail?: unknown } | null,
      );
      if (activeArtistId) {
        await refreshObjects(activeArtistId);
        void refreshSidebarIndexes(activeArtistId);
        await refreshDeletedPanel(activeArtistId);
      }
      return result;
    },
    [activeArtistId, refreshDeletedPanel, refreshObjects, refreshSidebarIndexes],
  );

  const selectArtist = useCallback(() => {
    setSelection({ type: 'artist' });
  }, []);

  const selectObject = useCallback((id: string) => {
    setSelection({ type: 'object', id });
  }, []);

  return {
    loading,
    error,
    devWarning,
    artists,
    activeArtist,
    activeArtistId,
    setActiveArtistId,
    objects: filteredObjects,
    allObjects: objects,
    selected,
    selection,
    selectArtist,
    selectObject,
    albumDetail,
    albumTrackSummaries,
    contentById,
    filter,
    setFilter,
    search,
    setSearch,
    trackCounts,
    createArtist,
    updateArtist,
    createObject,
    updateObject,
    deleteObject,
    getDeleteImpact,
    deletedObjects,
    deletionReports,
    deletedPanelLoading,
    refreshDeletedPanel,
    restoreObject,
    clearDeletionReport,
    clearAllDeletionReports,
    compileCatalog,
    getCompilePreview,
    importSunoIntoSong,
    renameCoverForObject,
    insertSongIntoAlbum,
    removeTrack,
    moveTrack,
    promoteArtwork,
    linkRelatedSongs,
    unlinkRelatedSongs,
    linkRelatedAlbums,
    unlinkRelatedAlbums,
    repairBrokenReference,
    refreshObjects,
  };
}
