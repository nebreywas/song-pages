/**
 * Per-song Song Editor section collapse state.
 *
 * Stored in SQLite settings (not on the Song payload) so UI chrome never
 * contaminates compile / publish data. Shape is a map of songId → section flags.
 */

export const SONG_SECTION_COLLAPSE_SETTINGS_KEY = 'ui.artist2.songSectionCollapse';

export const SONG_EDITOR_SECTION_IDS = [
  'musicalDetails',
  'adaptedWork',
  'links',
  'creationProcess',
  'lyrics',
  'recordings',
  'relatedSongs',
  'videoAndAnimation',
  'artwork',
  'creditsRights',
] as const;

export type SongEditorSectionId = (typeof SONG_EDITOR_SECTION_IDS)[number];

/** true = section body hidden. Missing keys default to expanded. */
export type SongSectionCollapseFlags = Partial<Record<SongEditorSectionId, boolean>>;

/** songId → which sections are collapsed for that Song. */
export type SongSectionCollapseStore = Record<string, SongSectionCollapseFlags>;

const SECTION_ID_SET = new Set<string>(SONG_EDITOR_SECTION_IDS);

function isSectionId(value: string): value is SongEditorSectionId {
  return SECTION_ID_SET.has(value);
}

/** Coerce arbitrary settings JSON into a safe store; drop unknown songs/sections. */
export function normalizeSongSectionCollapseStore(raw: unknown): SongSectionCollapseStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out: SongSectionCollapseStore = {};
  for (const [songId, flags] of Object.entries(raw as Record<string, unknown>)) {
    if (!songId || typeof songId !== 'string') continue;
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) continue;

    const nextFlags: SongSectionCollapseFlags = {};
    for (const [sectionId, collapsed] of Object.entries(flags as Record<string, unknown>)) {
      if (!isSectionId(sectionId)) continue;
      if (typeof collapsed !== 'boolean') continue;
      nextFlags[sectionId] = collapsed;
    }
    out[songId] = nextFlags;
  }
  return out;
}

export function songSectionIsCollapsed(
  flags: SongSectionCollapseFlags | undefined,
  sectionId: SongEditorSectionId,
): boolean {
  return Boolean(flags?.[sectionId]);
}

/** Immutably set one section flag for one song; omits `false` to keep the blob small. */
export function setSongSectionCollapsed(
  store: SongSectionCollapseStore,
  songId: string,
  sectionId: SongEditorSectionId,
  collapsed: boolean,
): SongSectionCollapseStore {
  const prevFlags = store[songId] ?? {};
  const nextFlags: SongSectionCollapseFlags = { ...prevFlags };
  if (collapsed) {
    nextFlags[sectionId] = true;
  } else {
    delete nextFlags[sectionId];
  }

  const nextStore: SongSectionCollapseStore = { ...store };
  if (Object.keys(nextFlags).length === 0) {
    delete nextStore[songId];
  } else {
    nextStore[songId] = nextFlags;
  }
  return nextStore;
}
