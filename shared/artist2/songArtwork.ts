/**
 * Song / Album artwork list — multi-image with exactly one Primary Cover (or none).
 * Legacy single `artwork` is mirrored from the primary for promote / rename.
 */

import type {
  Artist2ArtworkEntry,
  Artist2ArtworkRef,
  Artist2ArtworkRole,
  Artist2CatalogObject,
  Artist2ContentPayload,
  Artist2SongPayload,
} from './types';

export type SongArtworkPayloadSlice = {
  artworkEntries?: Artist2ArtworkEntry[];
  artwork?: Artist2ArtworkRef;
};

export const ARTWORK_ROLES: Artist2ArtworkRole[] = [
  'primary_cover',
  'additional_cover',
  'additional_image',
];

export const ARTWORK_ROLE_LABELS: Record<Artist2ArtworkRole, string> = {
  primary_cover: 'Primary Cover',
  additional_cover: 'Additional Cover',
  additional_image: 'Additional Image',
};

/** Soft guidance for description / commentary fields. */
export const ARTWORK_DESCRIPTION_SOFT_MAX = 120;
export const ARTWORK_COMMENTARY_SOFT_MAX = 500;

export function newArtworkEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function coerceArtworkRef(raw: unknown): Artist2ArtworkRef | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { mode?: string; path?: string | null; contentId?: string };
  if (row.mode === 'inline') {
    return { mode: 'inline', path: typeof row.path === 'string' ? row.path : row.path ?? null };
  }
  if (row.mode === 'contentRef' && typeof row.contentId === 'string' && row.contentId.trim()) {
    return { mode: 'contentRef', contentId: row.contentId };
  }
  return null;
}

function coerceRole(raw: unknown): Artist2ArtworkRole {
  if (raw === 'additional_cover' || raw === 'additional_image' || raw === 'primary_cover') {
    return raw;
  }
  return 'additional_image';
}

function coerceEntry(raw: unknown, index: number): Artist2ArtworkEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Artist2ArtworkEntry>;
  const source = coerceArtworkRef(row.source);
  if (!source) return null;
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id : newArtworkEntryId(),
    role: coerceRole(row.role),
    source,
    name: typeof row.name === 'string' ? row.name : undefined,
    description: typeof row.description === 'string' ? row.description : undefined,
    commentary: typeof row.commentary === 'string' ? row.commentary : undefined,
    sortOrder: Number.isFinite(row.sortOrder) ? Number(row.sortOrder) : index * 10,
  };
}

function artworkRefHasImage(ref: Artist2ArtworkRef | null | undefined): boolean {
  if (!ref) return false;
  if (ref.mode === 'inline') return Boolean(ref.path?.trim());
  return Boolean(ref.contentId?.trim());
}

/** Exactly zero or one primary; primary sorts first. */
export function ensureSinglePrimaryArtwork(
  entries: Artist2ArtworkEntry[],
): Artist2ArtworkEntry[] {
  if (entries.length === 0) return [];
  const primaryIdx = entries.findIndex((e) => e.role === 'primary_cover');
  let keepIdx = primaryIdx;
  if (keepIdx < 0) {
    // Prefer an entry that actually has an image file / ref.
    keepIdx = entries.findIndex((e) => artworkRefHasImage(e.source));
    if (keepIdx < 0) keepIdx = 0;
  }
  const normalized = entries.map((entry, index) => ({
    ...entry,
    role:
      index === keepIdx
        ? ('primary_cover' as const)
        : entry.role === 'primary_cover'
          ? ('additional_cover' as const)
          : entry.role,
  }));
  return [...normalized].sort((a, b) => {
    if (a.role === 'primary_cover' && b.role !== 'primary_cover') return -1;
    if (b.role === 'primary_cover' && a.role !== 'primary_cover') return 1;
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  });
}

/** Promote legacy single artwork into a one-item primary list. */
export function migrateLegacyArtwork(
  artwork: Artist2ArtworkRef | null | undefined,
): Artist2ArtworkEntry[] {
  if (!artwork) return [];
  if (!artworkRefHasImage(artwork) && artwork.mode === 'inline') {
    // Empty inline placeholder — no list entry yet.
    return [];
  }
  return [
    {
      id: newArtworkEntryId(),
      role: 'primary_cover',
      source: artwork,
      sortOrder: 0,
    },
  ];
}

/**
 * Canonical artwork list for Song / Album editors.
 * Migrates legacy `artwork` when entries are empty.
 */
export function normalizeSongArtwork(
  payload: SongArtworkPayloadSlice | null | undefined,
): Artist2ArtworkEntry[] {
  const raw = Array.isArray(payload?.artworkEntries) ? payload!.artworkEntries! : [];
  const entries = raw
    .map((row, index) => coerceEntry(row, index))
    .filter((row): row is Artist2ArtworkEntry => Boolean(row));
  if (entries.length > 0) return ensureSinglePrimaryArtwork(entries);
  return ensureSinglePrimaryArtwork(migrateLegacyArtwork(payload?.artwork));
}

export function primaryArtworkEntry(
  payload: SongArtworkPayloadSlice | null | undefined,
): Artist2ArtworkEntry | null {
  const entries = normalizeSongArtwork(payload);
  return entries.find((e) => e.role === 'primary_cover') ?? entries[0] ?? null;
}

export function primaryArtworkRef(
  payload: SongArtworkPayloadSlice | null | undefined,
): Artist2ArtworkRef | undefined {
  return primaryArtworkEntry(payload)?.source;
}

/** Mirror primary into legacy `artwork` for promote / rename / older readers. */
export function legacyArtworkFromEntries(
  entries: Artist2ArtworkEntry[],
): Artist2ArtworkRef {
  const ensured = ensureSinglePrimaryArtwork(entries);
  const primary = ensured.find((e) => e.role === 'primary_cover') ?? ensured[0];
  if (!primary) return { mode: 'inline', path: null };
  return primary.source;
}

/**
 * Apply a legacy single-field artwork patch into the multi-image list.
 * Used when insert-arrow / promote / suno still write `artwork`.
 */
export function applyLegacyArtworkToEntries(
  existingEntries: Artist2ArtworkEntry[] | undefined,
  artwork: Artist2ArtworkRef,
): Artist2ArtworkEntry[] {
  const current = normalizeSongArtwork({
    artworkEntries: existingEntries,
    artwork,
  });
  if (current.length === 0) {
    if (!artworkRefHasImage(artwork)) return [];
    return [
      {
        id: newArtworkEntryId(),
        role: 'primary_cover',
        source: artwork,
        sortOrder: 0,
      },
    ];
  }
  const primary = current.find((e) => e.role === 'primary_cover') ?? current[0];
  return ensureSinglePrimaryArtwork(
    current.map((entry) =>
      entry.id === primary.id ? { ...entry, source: artwork } : entry,
    ),
  );
}

export function setPrimaryArtwork(
  entries: Artist2ArtworkEntry[],
  entryId: string,
): Artist2ArtworkEntry[] {
  return ensureSinglePrimaryArtwork(
    entries.map((entry) => ({
      ...entry,
      role:
        entry.id === entryId
          ? 'primary_cover'
          : entry.role === 'primary_cover'
            ? 'additional_cover'
            : entry.role,
    })),
  );
}

export function createArtworkEntry(
  source: Artist2ArtworkRef,
  opts: { role?: Artist2ArtworkRole; sortOrder?: number; name?: string } = {},
): Artist2ArtworkEntry {
  return {
    id: newArtworkEntryId(),
    role: opts.role ?? 'additional_image',
    source,
    name: opts.name,
    sortOrder: opts.sortOrder ?? 100,
  };
}

export function resolveArtworkEntryPath(
  entry: Artist2ArtworkEntry | null | undefined,
  contentById: Map<string, Artist2CatalogObject>,
): string | null {
  if (!entry) return null;
  const source = entry.source;
  if (source.mode === 'inline') return source.path?.trim() || null;
  const content = contentById.get(source.contentId);
  if (content?.kind === 'content' && content.contentType === 'image') {
    const payload = content.payload as Artist2ContentPayload;
    return payload.filePath?.trim() || null;
  }
  return null;
}

export function resolvePrimaryArtworkPath(
  payload: SongArtworkPayloadSlice | null | undefined,
  contentById: Map<string, Artist2CatalogObject>,
): string | null {
  return resolveArtworkEntryPath(primaryArtworkEntry(payload), contentById);
}

/** True when the Song has no usable primary cover image. */
export function songMissingPrimaryArtwork(payload: Artist2SongPayload): boolean {
  const primary = primaryArtworkEntry(payload);
  if (!primary) return true;
  return !artworkRefHasImage(primary.source);
}

/** Clear contentRef sources pointing at a deleted Content id. */
export function clearArtworkEntriesContentRef(
  entries: Artist2ArtworkEntry[],
  contentId: string,
): Artist2ArtworkEntry[] {
  return entries.map((entry) => {
    if (entry.source.mode === 'contentRef' && entry.source.contentId === contentId) {
      return { ...entry, source: { mode: 'inline' as const, path: null } };
    }
    return entry;
  });
}
