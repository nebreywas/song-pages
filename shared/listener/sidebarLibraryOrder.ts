import { reorderPlaylistIds } from './playlistOrder.ts';
import { isUserPlaylistArtistId } from './userPlaylists.ts';

export type SidebarLibraryArtistRow = {
  id: number;
  artist_name: string;
  created_at: string | null;
  song_count?: number | null;
};

export const SIDEBAR_LIBRARY_ORDER_KEY = 'ui.listenerSidebarOrder';
export const SIDEBAR_LIBRARY_SORT_KEY = 'ui.listenerSidebarSort';

export type SidebarLibrarySortColumn = 'order' | 'name' | 'type' | 'added' | 'songs';
export type SidebarLibrarySortDirection = 'asc' | 'desc';

export type SidebarLibrarySortState = {
  column: SidebarLibrarySortColumn;
  direction: SidebarLibrarySortDirection;
};

export const DEFAULT_SIDEBAR_LIBRARY_SORT: SidebarLibrarySortState = {
  column: 'order',
  direction: 'asc',
};

/** Pseudo-artist id for Liked Songs — always pinned above sortable rows. */
export const LIKED_SONGS_SIDEBAR_ID = 0;

export function normalizeSidebarLibraryOrder(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
    .map((id) => Math.trunc(id));
}

export function normalizeSidebarLibrarySort(value: unknown): SidebarLibrarySortState {
  if (!value || typeof value !== 'object') return DEFAULT_SIDEBAR_LIBRARY_SORT;
  const record = value as Record<string, unknown>;
  const column = record.column;
  const direction = record.direction;
  const validColumns: SidebarLibrarySortColumn[] = ['order', 'name', 'type', 'added', 'songs'];
  const validDirections: SidebarLibrarySortDirection[] = ['asc', 'desc'];
  return {
    column: validColumns.includes(column as SidebarLibrarySortColumn)
      ? (column as SidebarLibrarySortColumn)
      : DEFAULT_SIDEBAR_LIBRARY_SORT.column,
    direction: validDirections.includes(direction as SidebarLibrarySortDirection)
      ? (direction as SidebarLibrarySortDirection)
      : DEFAULT_SIDEBAR_LIBRARY_SORT.direction,
  };
}

export function isLikedSongsSidebarArtist(artistId: number): boolean {
  return artistId === LIKED_SONGS_SIDEBAR_ID;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

function parseAddedTimestamp(value: string | null | undefined): number {
  if (!value?.trim()) return Number.NaN;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
}

/** Split Liked Songs from rows that participate in manual order and column sort. */
export function splitSidebarLikedEntry(artists: readonly SidebarLibraryArtistRow[]): {
  liked: SidebarLibraryArtistRow | null;
  rest: SidebarLibraryArtistRow[];
} {
  const liked = artists.find((artist) => isLikedSongsSidebarArtist(artist.id)) ?? null;
  const rest = artists.filter((artist) => !isLikedSongsSidebarArtist(artist.id));
  return { liked, rest };
}

/** Apply saved manual order, appending new sidebar entries at the end. */
export function mergeSidebarLibraryOrder(
  rest: readonly SidebarLibraryArtistRow[],
  savedOrderIds: readonly number[],
): { ordered: SidebarLibraryArtistRow[]; orderIds: number[] } {
  const byId = new Map(rest.map((artist) => [artist.id, artist]));
  const ordered: SidebarLibraryArtistRow[] = [];
  const seen = new Set<number>();

  for (const id of savedOrderIds) {
    const artist = byId.get(id);
    if (!artist || seen.has(id)) continue;
    ordered.push(artist);
    seen.add(id);
  }

  for (const artist of rest) {
    if (seen.has(artist.id)) continue;
    ordered.push(artist);
    seen.add(artist.id);
  }

  return { ordered, orderIds: ordered.map((artist) => artist.id) };
}

export type SidebarEntryType = 'artist' | 'liked' | 'playlist';

/** Minimal type label helper — mirrors sidebarEntry.ts without renderer imports. */
export function sidebarEntryTypeForSort(artist: SidebarLibraryArtistRow): SidebarEntryType {
  if (isLikedSongsSidebarArtist(artist.id)) return 'liked';
  if (isUserPlaylistArtistId(artist.id)) return 'playlist';
  return 'artist';
}

export function sidebarEntryTypeSortLabel(type: SidebarEntryType): string {
  switch (type) {
    case 'artist':
      return 'Artist Pages';
    case 'liked':
      return 'Liked Songs';
    case 'playlist':
      return 'Playlist';
  }
}

function sortSidebarRest(
  rest: readonly SidebarLibraryArtistRow[],
  sort: SidebarLibrarySortState,
  orderIndexById: ReadonlyMap<number, number>,
): SidebarLibraryArtistRow[] {
  const mult = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...rest];

  sorted.sort((a, b) => {
    let result = 0;

    switch (sort.column) {
      case 'order': {
        const aIndex = orderIndexById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndexById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        result = aIndex - bIndex;
        break;
      }
      case 'name':
        result = compareText(a.artist_name, b.artist_name);
        break;
      case 'type':
        result = compareText(
          sidebarEntryTypeSortLabel(sidebarEntryTypeForSort(a)),
          sidebarEntryTypeSortLabel(sidebarEntryTypeForSort(b)),
        );
        break;
      case 'added': {
        const aTime = parseAddedTimestamp(a.created_at);
        const bTime = parseAddedTimestamp(b.created_at);
        const aMissing = Number.isNaN(aTime);
        const bMissing = Number.isNaN(bTime);
        if (aMissing && bMissing) result = 0;
        else if (aMissing) result = 1;
        else if (bMissing) result = -1;
        else result = aTime - bTime;
        break;
      }
      case 'songs': {
        const aCount =
          typeof a.song_count === 'number' && Number.isFinite(a.song_count)
            ? Math.max(0, a.song_count)
            : 0;
        const bCount =
          typeof b.song_count === 'number' && Number.isFinite(b.song_count)
            ? Math.max(0, b.song_count)
            : 0;
        result = aCount - bCount;
        break;
      }
      default:
        result = 0;
    }

    if (result === 0 && sort.column !== 'name') {
      result = compareText(a.artist_name, b.artist_name);
    }

    return result * mult;
  });

  return sorted;
}

/** Build sidebar rows — Liked Songs pinned first, then sorted manual-order rows. */
export function layoutSidebarLibrary(
  artists: readonly SidebarLibraryArtistRow[],
  savedOrderIds: readonly number[],
  sort: SidebarLibrarySortState,
): {
  displayArtists: SidebarLibraryArtistRow[];
  orderIds: number[];
  orderNumberById: Map<number, number>;
} {
  const { liked, rest } = splitSidebarLikedEntry(artists);
  const { ordered, orderIds } = mergeSidebarLibraryOrder(rest, savedOrderIds);
  const orderIndexById = new Map(orderIds.map((id, index) => [id, index]));
  const sortedRest = sortSidebarRest(ordered, sort, orderIndexById);
  const displayArtists = liked ? [liked, ...sortedRest] : sortedRest;
  const orderNumberById = new Map(orderIds.map((id, index) => [id, index + 1]));
  return { displayArtists, orderIds, orderNumberById };
}

/** Move one sidebar entry within the manual-order list (Liked Songs excluded). */
export function reorderSidebarLibraryOrder(
  orderIds: readonly number[],
  fromIndex: number,
  toIndex: number,
): number[] {
  return reorderPlaylistIds([...orderIds], fromIndex, toIndex);
}

/** Toggle sort column/direction the same way the song table headers behave. */
export function toggleSidebarLibrarySort(
  current: SidebarLibrarySortState,
  column: SidebarLibrarySortColumn,
): SidebarLibrarySortState {
  if (current.column === column) {
    return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { column, direction: 'asc' };
};
