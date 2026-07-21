/**
 * Per-playlist Playlist Editor section collapse state.
 * Stored in SQLite settings (not on the Playlist payload).
 */

export const PLAYLIST_SECTION_COLLAPSE_SETTINGS_KEY = 'ui.artist2.playlistSectionCollapse';

export const PLAYLIST_EDITOR_SECTION_IDS = [
  'links',
  'artwork',
  'creditsRights',
] as const;

export type PlaylistEditorSectionId = (typeof PLAYLIST_EDITOR_SECTION_IDS)[number];

/** true = section body hidden. Missing keys default to expanded. */
export type PlaylistSectionCollapseFlags = Partial<Record<PlaylistEditorSectionId, boolean>>;

/** playlistId → which sections are collapsed for that Playlist. */
export type PlaylistSectionCollapseStore = Record<string, PlaylistSectionCollapseFlags>;

const SECTION_ID_SET = new Set<string>(PLAYLIST_EDITOR_SECTION_IDS);

function isSectionId(value: string): value is PlaylistEditorSectionId {
  return SECTION_ID_SET.has(value);
}

/** Coerce arbitrary settings JSON into a safe store; drop unknown playlists/sections. */
export function normalizePlaylistSectionCollapseStore(
  raw: unknown,
): PlaylistSectionCollapseStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out: PlaylistSectionCollapseStore = {};
  for (const [playlistId, flags] of Object.entries(raw as Record<string, unknown>)) {
    if (!playlistId || typeof playlistId !== 'string') continue;
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) continue;

    const nextFlags: PlaylistSectionCollapseFlags = {};
    for (const [sectionId, collapsed] of Object.entries(flags as Record<string, unknown>)) {
      if (!isSectionId(sectionId)) continue;
      if (typeof collapsed !== 'boolean') continue;
      nextFlags[sectionId] = collapsed;
    }
    out[playlistId] = nextFlags;
  }
  return out;
}

export function playlistSectionIsCollapsed(
  flags: PlaylistSectionCollapseFlags | undefined,
  sectionId: PlaylistEditorSectionId,
): boolean {
  return Boolean(flags?.[sectionId]);
}

/** Immutably set one section flag for one playlist; omits `false` to keep the blob small. */
export function setPlaylistSectionCollapsed(
  store: PlaylistSectionCollapseStore,
  playlistId: string,
  sectionId: PlaylistEditorSectionId,
  collapsed: boolean,
): PlaylistSectionCollapseStore {
  const prevFlags = store[playlistId] ?? {};
  const nextFlags: PlaylistSectionCollapseFlags = { ...prevFlags };
  if (collapsed) {
    nextFlags[sectionId] = true;
  } else {
    delete nextFlags[sectionId];
  }

  const nextStore: PlaylistSectionCollapseStore = { ...store };
  if (Object.keys(nextFlags).length === 0) {
    delete nextStore[playlistId];
  } else {
    nextStore[playlistId] = nextFlags;
  }
  return nextStore;
}
