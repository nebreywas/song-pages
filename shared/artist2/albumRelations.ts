/**
 * Album↔Album relationships — references only, never duplicate Albums.
 * Adapted from Song relations with album-oriented kinds.
 */

export const ARTIST2_ALBUM_RELATION_KINDS = [
  'sister',
  'deluxe',
  'reissue',
  'sequel',
  'compilation',
  'other',
] as const;

export type Artist2AlbumRelationKind = (typeof ARTIST2_ALBUM_RELATION_KINDS)[number];

export type Artist2AlbumRelation = {
  albumId: string;
  relation: Artist2AlbumRelationKind;
  /** Optional public / private note for this link. */
  note?: string;
};

export function albumRelationLabel(kind: Artist2AlbumRelationKind): string {
  switch (kind) {
    case 'sister':
      return 'Sister Album';
    case 'deluxe':
      return 'Deluxe / expanded';
    case 'reissue':
      return 'Reissue';
    case 'sequel':
      return 'Sequel / follow-up';
    case 'compilation':
      return 'Compilation companion';
    case 'other':
    default:
      return 'Related';
  }
}

export function normalizeAlbumRelations(raw: unknown): Artist2AlbumRelation[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Artist2AlbumRelation[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const albumId =
      typeof (entry as { albumId?: unknown }).albumId === 'string'
        ? (entry as { albumId: string }).albumId.trim()
        : '';
    if (!albumId || seen.has(albumId)) continue;
    const relationRaw = (entry as { relation?: unknown }).relation;
    const relation = ARTIST2_ALBUM_RELATION_KINDS.includes(
      relationRaw as Artist2AlbumRelationKind,
    )
      ? (relationRaw as Artist2AlbumRelationKind)
      : 'sister';
    const note =
      typeof (entry as { note?: unknown }).note === 'string'
        ? (entry as { note: string }).note
        : undefined;
    seen.add(albumId);
    out.push({ albumId, relation, note });
  }
  return out;
}

/** Upsert one relation (by albumId); returns next list. */
export function upsertAlbumRelation(
  list: Artist2AlbumRelation[],
  next: Artist2AlbumRelation,
): Artist2AlbumRelation[] {
  const filtered = list.filter((row) => row.albumId !== next.albumId);
  return [...filtered, next];
}

export function removeAlbumRelation(
  list: Artist2AlbumRelation[],
  albumId: string,
): Artist2AlbumRelation[] {
  return list.filter((row) => row.albumId !== albumId);
}
