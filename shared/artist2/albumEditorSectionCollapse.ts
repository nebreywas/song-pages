/**
 * Per-album Album Editor section collapse state.
 *
 * Stored in SQLite settings (not on the Album payload) so UI chrome never
 * contaminates compile / publish data.
 */

export const ALBUM_SECTION_COLLAPSE_SETTINGS_KEY = 'ui.artist2.albumSectionCollapse';

export const ALBUM_EDITOR_SECTION_IDS = [
  'links',
  'relatedAlbums',
  'artwork',
  'creditsRights',
] as const;

export type AlbumEditorSectionId = (typeof ALBUM_EDITOR_SECTION_IDS)[number];

/** true = section body hidden. Missing keys default to expanded. */
export type AlbumSectionCollapseFlags = Partial<Record<AlbumEditorSectionId, boolean>>;

/** albumId → which sections are collapsed for that Album. */
export type AlbumSectionCollapseStore = Record<string, AlbumSectionCollapseFlags>;

const SECTION_ID_SET = new Set<string>(ALBUM_EDITOR_SECTION_IDS);

function isSectionId(value: string): value is AlbumEditorSectionId {
  return SECTION_ID_SET.has(value);
}

/** Coerce arbitrary settings JSON into a safe store; drop unknown albums/sections. */
export function normalizeAlbumSectionCollapseStore(raw: unknown): AlbumSectionCollapseStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out: AlbumSectionCollapseStore = {};
  for (const [albumId, flags] of Object.entries(raw as Record<string, unknown>)) {
    if (!albumId || typeof albumId !== 'string') continue;
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) continue;

    const nextFlags: AlbumSectionCollapseFlags = {};
    for (const [sectionId, collapsed] of Object.entries(flags as Record<string, unknown>)) {
      if (!isSectionId(sectionId)) continue;
      if (typeof collapsed !== 'boolean') continue;
      nextFlags[sectionId] = collapsed;
    }
    out[albumId] = nextFlags;
  }
  return out;
}

export function albumSectionIsCollapsed(
  flags: AlbumSectionCollapseFlags | undefined,
  sectionId: AlbumEditorSectionId,
): boolean {
  return Boolean(flags?.[sectionId]);
}

/** Immutably set one section flag for one album; omits `false` to keep the blob small. */
export function setAlbumSectionCollapsed(
  store: AlbumSectionCollapseStore,
  albumId: string,
  sectionId: AlbumEditorSectionId,
  collapsed: boolean,
): AlbumSectionCollapseStore {
  const prevFlags = store[albumId] ?? {};
  const nextFlags: AlbumSectionCollapseFlags = { ...prevFlags };
  if (collapsed) {
    nextFlags[sectionId] = true;
  } else {
    delete nextFlags[sectionId];
  }

  const nextStore: AlbumSectionCollapseStore = { ...store };
  if (Object.keys(nextFlags).length === 0) {
    delete nextStore[albumId];
  } else {
    nextStore[albumId] = nextFlags;
  }
  return nextStore;
}
