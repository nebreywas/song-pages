/**
 * Per-playlist table view preferences: Year↔Plays column mode + sort.
 * Widths stay on the global layout profile; this store is the per-playlist chrome.
 */

export type PlaylistTableSortColumn =
  | 'order'
  | 'custom'
  | 'title'
  | 'artist'
  | 'album'
  | 'year'
  | 'plays'
  | 'source'
  | 'length';

export type PlaylistTableSortDirection = 'asc' | 'desc';

/** Which value occupies the Year column slot (same width, swapped content). */
export type PlaylistYearColumnMode = 'year' | 'plays';

export type PlaylistTableViewState = {
  yearColumnMode: PlaylistYearColumnMode;
  sortColumn: PlaylistTableSortColumn;
  sortDirection: PlaylistTableSortDirection;
};

/** Keyed by playlistKeyForArtistId (e.g. artist:12, user:3, liked). */
export type PlaylistTableViewStore = Record<string, PlaylistTableViewState>;

export const PLAYLIST_TABLE_VIEW_SETTINGS_KEY = 'ui.listenerPlaylistTableView';

export const DEFAULT_PLAYLIST_TABLE_VIEW: PlaylistTableViewState = {
  yearColumnMode: 'year',
  sortColumn: 'order',
  sortDirection: 'asc',
};

const SORT_COLUMNS: readonly PlaylistTableSortColumn[] = [
  'order',
  'custom',
  'title',
  'artist',
  'album',
  'year',
  'plays',
  'source',
  'length',
];

const SORT_DIRECTIONS: readonly PlaylistTableSortDirection[] = ['asc', 'desc'];
const YEAR_MODES: readonly PlaylistYearColumnMode[] = ['year', 'plays'];

export function normalizePlaylistYearColumnMode(raw: unknown): PlaylistYearColumnMode {
  return YEAR_MODES.includes(raw as PlaylistYearColumnMode)
    ? (raw as PlaylistYearColumnMode)
    : DEFAULT_PLAYLIST_TABLE_VIEW.yearColumnMode;
}

export function normalizePlaylistTableSortColumn(raw: unknown): PlaylistTableSortColumn {
  return SORT_COLUMNS.includes(raw as PlaylistTableSortColumn)
    ? (raw as PlaylistTableSortColumn)
    : DEFAULT_PLAYLIST_TABLE_VIEW.sortColumn;
}

export function normalizePlaylistTableSortDirection(raw: unknown): PlaylistTableSortDirection {
  return SORT_DIRECTIONS.includes(raw as PlaylistTableSortDirection)
    ? (raw as PlaylistTableSortDirection)
    : DEFAULT_PLAYLIST_TABLE_VIEW.sortDirection;
}

export function normalizePlaylistTableViewState(raw: unknown): PlaylistTableViewState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PLAYLIST_TABLE_VIEW };
  const value = raw as Partial<PlaylistTableViewState>;
  let sortColumn = normalizePlaylistTableSortColumn(value.sortColumn);
  const yearColumnMode = normalizePlaylistYearColumnMode(value.yearColumnMode);

  // Keep sort coherent with the visible Year-slot mode.
  if (yearColumnMode === 'plays' && sortColumn === 'year') sortColumn = 'plays';
  if (yearColumnMode === 'year' && sortColumn === 'plays') sortColumn = 'year';

  return {
    yearColumnMode,
    sortColumn,
    sortDirection: normalizePlaylistTableSortDirection(value.sortDirection),
  };
}

export function normalizePlaylistTableViewStore(raw: unknown): PlaylistTableViewStore {
  if (!raw || typeof raw !== 'object') return {};
  const store: PlaylistTableViewStore = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim()) continue;
    store[key] = normalizePlaylistTableViewState(value);
  }
  return store;
}

export function playlistTableViewForKey(
  store: PlaylistTableViewStore,
  playlistKey: string | null | undefined,
): PlaylistTableViewState {
  if (!playlistKey) return { ...DEFAULT_PLAYLIST_TABLE_VIEW };
  return store[playlistKey] ? { ...store[playlistKey] } : { ...DEFAULT_PLAYLIST_TABLE_VIEW };
}

/**
 * Double-click Year/Plays header: flip the slot mode and remap an active
 * year/plays sort so the header indicator stays honest.
 */
export function togglePlaylistYearColumnMode(state: PlaylistTableViewState): PlaylistTableViewState {
  const nextMode: PlaylistYearColumnMode = state.yearColumnMode === 'year' ? 'plays' : 'year';
  let sortColumn = state.sortColumn;
  if (nextMode === 'plays' && sortColumn === 'year') sortColumn = 'plays';
  if (nextMode === 'year' && sortColumn === 'plays') sortColumn = 'year';
  return { ...state, yearColumnMode: nextMode, sortColumn };
}
