/**
 * Song↔Song relationships (sister / remix / …) — references only, never duplicate Songs.
 */

export const ARTIST2_SONG_RELATION_KINDS = [
  'sister',
  'remix',
  'reinterpretation',
  'sequel',
  'acoustic',
  'genre',
  'lyrical',
  'other',
] as const;

export type Artist2SongRelationKind = (typeof ARTIST2_SONG_RELATION_KINDS)[number];

export type Artist2SongRelation = {
  songId: string;
  relation: Artist2SongRelationKind;
  /** Optional public / private note for this link. */
  note?: string;
};

export function songRelationLabel(kind: Artist2SongRelationKind): string {
  switch (kind) {
    case 'sister':
      return 'Sister Song';
    case 'remix':
      return 'Remix';
    case 'reinterpretation':
      return 'Reinterpretation';
    case 'sequel':
      return 'Sequel';
    case 'acoustic':
      return 'Acoustic adaptation';
    case 'genre':
      return 'Genre transformation';
    case 'lyrical':
      return 'Lyrical rewrite';
    case 'other':
    default:
      return 'Related';
  }
}

export function normalizeSongRelations(
  raw: unknown,
): Artist2SongRelation[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Artist2SongRelation[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const songId = typeof (entry as { songId?: unknown }).songId === 'string'
      ? (entry as { songId: string }).songId.trim()
      : '';
    if (!songId || seen.has(songId)) continue;
    const relationRaw = (entry as { relation?: unknown }).relation;
    const relation = ARTIST2_SONG_RELATION_KINDS.includes(relationRaw as Artist2SongRelationKind)
      ? (relationRaw as Artist2SongRelationKind)
      : 'sister';
    const note =
      typeof (entry as { note?: unknown }).note === 'string'
        ? (entry as { note: string }).note
        : undefined;
    seen.add(songId);
    out.push({ songId, relation, note });
  }
  return out;
}

/** Upsert one relation (by songId); returns next list. */
export function upsertSongRelation(
  list: Artist2SongRelation[],
  next: Artist2SongRelation,
): Artist2SongRelation[] {
  const filtered = list.filter((row) => row.songId !== next.songId);
  return [...filtered, next];
}

export function removeSongRelation(
  list: Artist2SongRelation[],
  songId: string,
): Artist2SongRelation[] {
  return list.filter((row) => row.songId !== songId);
}
