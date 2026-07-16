/**
 * Catalog sidebar — flat list formatting, filter, and sort helpers.
 */

import type { Artist2CatalogObject, Artist2LibraryFilter, Artist2AlbumTrackSummaries } from '@shared/artist2';

export type CatalogSortKey = 'name-asc' | 'name-desc' | 'added-desc' | 'added-asc' | 'type-asc';

export function formatCatalogAddedDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
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

export function filterCatalogObjects(
  objects: Artist2CatalogObject[],
  filter: Artist2LibraryFilter,
): Artist2CatalogObject[] {
  if (filter === 'songs') return objects.filter((row) => row.kind === 'song');
  if (filter === 'containers') {
    return objects.filter((row) => row.kind === 'album' || row.kind === 'playlist');
  }
  if (filter === 'content') return objects.filter((row) => row.kind === 'content');
  return objects;
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
