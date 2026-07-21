/**
 * Catalog sidebar — flat list formatting, filter, and sort helpers.
 */

import type {
  Artist2AlbumTrackSummaries,
  Artist2CatalogObject,
  Artist2LibraryFilter,
  Artist2LibraryFilterKey,
} from '@shared/artist2';
import { ARTIST2_LIBRARY_FILTER_ALL, normalizeSongRecordings } from '@shared/artist2';

export type CatalogSortKey =
  | 'name-asc'
  | 'name-desc'
  | 'added-desc'
  | 'added-asc'
  | 'type-asc'
  | 'type-desc';

/** Clickable header columns that drive sorting. */
export type CatalogSortColumn = 'name' | 'type' | 'added';

export type CatalogSortDirection = 'asc' | 'desc';

/** Which column + direction a sort key represents (for header indicators / aria-sort). */
export function sortColumnFromKey(sortKey: CatalogSortKey): {
  column: CatalogSortColumn;
  direction: CatalogSortDirection;
} {
  switch (sortKey) {
    case 'name-desc':
      return { column: 'name', direction: 'desc' };
    case 'type-asc':
      return { column: 'type', direction: 'asc' };
    case 'type-desc':
      return { column: 'type', direction: 'desc' };
    case 'added-asc':
      return { column: 'added', direction: 'asc' };
    case 'added-desc':
      return { column: 'added', direction: 'desc' };
    case 'name-asc':
    default:
      return { column: 'name', direction: 'asc' };
  }
}

/**
 * Sort key produced by clicking a column header: toggle direction when the
 * column is already active, otherwise fall to that column's natural default
 * (name/type ascending A–Z; added descending = newest first).
 */
export function nextSortKeyForColumn(
  column: CatalogSortColumn,
  currentKey: CatalogSortKey,
): CatalogSortKey {
  const current = sortColumnFromKey(currentKey);
  if (current.column === column) {
    const flipped: CatalogSortDirection = current.direction === 'asc' ? 'desc' : 'asc';
    return `${column}-${flipped}` as CatalogSortKey;
  }
  return column === 'added' ? 'added-desc' : (`${column}-asc` as CatalogSortKey);
}

export function formatCatalogAddedDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

export function catalogTypeLabel(obj: Artist2CatalogObject): string {
  if (obj.kind === 'content') {
    if (obj.contentType === 'text') return 'Text';
    if (obj.contentType === 'video') return 'Video';
    if (obj.contentType === 'audio') return 'Audio';
    return 'Image';
  }
  if (obj.kind === 'album') return 'Album';
  if (obj.kind === 'playlist') return 'Playlist';
  return 'Song';
}

/** True when a Song has at least one recording with an audio file attached. */
export function catalogObjectHasRecording(obj: Artist2CatalogObject | null | undefined): boolean {
  if (!obj || obj.kind !== 'song') return false;
  return normalizeSongRecordings(obj.payload).some((row) => Boolean(row.audioPath?.trim()));
}

/** Whether a catalog row is included by the current multi-kind filter. */
export function objectMatchesLibraryFilter(
  obj: Artist2CatalogObject,
  filter: Artist2LibraryFilter,
): boolean {
  if (filter.all) return true;
  if (filter.songs && obj.kind === 'song') return true;
  if (filter.containers && (obj.kind === 'album' || obj.kind === 'playlist')) return true;
  if (filter.content && obj.kind === 'content') return true;
  return false;
}

/**
 * Toggle All / Songs / Containers / Content:
 * - All clears the kind toggles
 * - Turning a kind on clears All
 * - All three kinds on collapses back to All
 * - Turning the last kind off also falls back to All
 */
export function toggleLibraryFilter(
  current: Artist2LibraryFilter,
  key: Artist2LibraryFilterKey,
): Artist2LibraryFilter {
  if (key === 'all') return { ...ARTIST2_LIBRARY_FILTER_ALL };

  // From All, the first kind click becomes a single-kind filter.
  if (current.all) {
    return {
      all: false,
      songs: key === 'songs',
      containers: key === 'containers',
      content: key === 'content',
    };
  }

  const next: Artist2LibraryFilter = {
    all: false,
    songs: key === 'songs' ? !current.songs : current.songs,
    containers: key === 'containers' ? !current.containers : current.containers,
    content: key === 'content' ? !current.content : current.content,
  };

  if (!next.songs && !next.containers && !next.content) {
    return { ...ARTIST2_LIBRARY_FILTER_ALL };
  }
  if (next.songs && next.containers && next.content) {
    return { ...ARTIST2_LIBRARY_FILTER_ALL };
  }
  return next;
}

/**
 * Apply kind filter first, then name search within that subset
 * (search narrows the filtered view — it never replaces the filter).
 */
export function filterCatalogObjects(
  objects: Artist2CatalogObject[],
  filter: Artist2LibraryFilter,
  search = '',
): Artist2CatalogObject[] {
  const query = search.trim().toLowerCase();
  return objects.filter((row) => {
    if (!objectMatchesLibraryFilter(row, filter)) return false;
    if (!query) return true;
    return row.name.toLowerCase().includes(query);
  });
}

export function sortCatalogObjects(
  objects: Artist2CatalogObject[],
  sortKey: CatalogSortKey,
): Artist2CatalogObject[] {
  const rows = [...objects];
  rows.sort((a, b) => {
    switch (sortKey) {
      case 'name-desc':
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      case 'added-desc':
        return b.createdAt.localeCompare(a.createdAt);
      case 'added-asc':
        return a.createdAt.localeCompare(b.createdAt);
      case 'type-asc': {
        const typeCmp = catalogTypeLabel(a).localeCompare(catalogTypeLabel(b));
        return typeCmp !== 0 ? typeCmp : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      case 'type-desc': {
        const typeCmp = catalogTypeLabel(b).localeCompare(catalogTypeLabel(a));
        return typeCmp !== 0 ? typeCmp : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
  });
  return rows;
}

export function patchSongNameInSummaries(
  summaries: Artist2AlbumTrackSummaries,
  songId: string,
  name: string,
): Artist2AlbumTrackSummaries {
  let changed = false;
  const next: Artist2AlbumTrackSummaries = {};
  for (const [albumId, tracks] of Object.entries(summaries)) {
    next[albumId] = tracks.map((track) => {
      if (track.id !== songId) return track;
      changed = true;
      return { ...track, name };
    });
  }
  return changed ? next : summaries;
}
