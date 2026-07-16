/**
 * Structured Song link rows — replaces flat youtube/spotify/soundcloud/suno fields.
 * Cutover: writers use linkEntries only; flat `links` is read once for migration.
 */

import {
  findProviderById,
  type ProviderCapability,
} from './providersSocialRegistry';
import type {
  Artist2SongLink,
  Artist2SongLinkKind,
  Artist2SongLinkVisibility,
  Artist2SongLinks,
  Artist2SongPagesPublishState,
  Artist2SongPayload,
} from './types';

export type {
  Artist2SongLink,
  Artist2SongLinkKind,
  Artist2SongLinkVisibility,
  Artist2SongPagesPublishState,
} from './types';

export type SongLinksPayloadSlice = {
  linkEntries?: Artist2SongLink[];
  /** @deprecated Flat map — migrated into linkEntries on read. */
  links?: Artist2SongLinks;
};

export const SONG_PAGES_STATE_LABELS: Record<Artist2SongPagesPublishState, string> = {
  not_published: 'Not published',
  preview: 'Preview available',
  published: 'Published',
};

export function newSongLinkId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lnk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultVisibility(kind: Artist2SongLinkKind): Artist2SongLinkVisibility {
  return kind === 'distribution' ? 'private' : 'public';
}

/** Structural URL check — do not rewrite or invent provider URLs. */
export function isStructurallyValidUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createSongPagesStub(sortOrder = 0): Artist2SongLink {
  return {
    id: newSongLinkId(),
    kind: 'song_pages',
    label: 'Song Pages',
    visibility: 'public',
    sortOrder,
    songPagesState: 'not_published',
  };
}

export function createEmptyLinkRow(
  kind: Exclude<Artist2SongLinkKind, 'song_pages'>,
  opts: { providerId?: string; sortOrder?: number; dateAdded?: string } = {},
): Artist2SongLink {
  return {
    id: newSongLinkId(),
    kind,
    providerId: opts.providerId ?? null,
    label: kind === 'web' ? '' : undefined,
    url: '',
    visibility: defaultVisibility(kind),
    sortOrder: opts.sortOrder ?? 100,
    dateAdded: opts.dateAdded,
  };
}

function coerceLink(raw: unknown, index: number): Artist2SongLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Artist2SongLink>;
  const kind = row.kind;
  if (
    kind !== 'web' &&
    kind !== 'song_pages' &&
    kind !== 'streaming' &&
    kind !== 'social' &&
    kind !== 'distribution'
  ) {
    return null;
  }
  const visibility: Artist2SongLinkVisibility =
    row.visibility === 'private' ? 'private' : defaultVisibility(kind);
  const songPagesState: Artist2SongPagesPublishState | undefined =
    kind === 'song_pages'
      ? row.songPagesState === 'preview' || row.songPagesState === 'published'
        ? row.songPagesState
        : 'not_published'
      : undefined;
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id : newSongLinkId(),
    kind,
    providerId: typeof row.providerId === 'string' ? row.providerId : row.providerId ?? null,
    label: typeof row.label === 'string' ? row.label : undefined,
    url: typeof row.url === 'string' ? row.url : undefined,
    visibility,
    sortOrder: Number.isFinite(row.sortOrder) ? Number(row.sortOrder) : index * 10,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    songPagesState,
    dateAdded: typeof row.dateAdded === 'string' ? row.dateAdded : undefined,
  };
}

/** Promote legacy flat links into structured rows (one-time read path). */
export function migrateFlatLinks(flat: Artist2SongLinks | null | undefined): Artist2SongLink[] {
  if (!flat || typeof flat !== 'object') return [];
  const out: Artist2SongLink[] = [];
  const pairs: Array<{ key: keyof Artist2SongLinks; providerId: string }> = [
    { key: 'youtube', providerId: 'youtube' },
    { key: 'spotify', providerId: 'spotify' },
    { key: 'soundcloud', providerId: 'soundcloud' },
    { key: 'suno', providerId: 'suno' },
  ];
  let order = 10;
  for (const { key, providerId } of pairs) {
    const url = flat[key]?.trim();
    if (!url) continue;
    out.push({
      id: newSongLinkId(),
      kind: 'streaming',
      providerId,
      url,
      visibility: 'public',
      sortOrder: order,
    });
    order += 10;
  }
  return out;
}

function sortLinks(entries: Artist2SongLink[]): Artist2SongLink[] {
  return [...entries].sort((a, b) => {
    // Song Pages stub always leads the list.
    if (a.kind === 'song_pages' && b.kind !== 'song_pages') return -1;
    if (b.kind === 'song_pages' && a.kind !== 'song_pages') return 1;
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  });
}

/**
 * Canonical list for editors / compile.
 * Ensures a Song Pages stub exists; migrates flat `links` when entries are empty.
 */
export function normalizeSongLinks(
  payload: SongLinksPayloadSlice | null | undefined,
): Artist2SongLink[] {
  const raw = Array.isArray(payload?.linkEntries) ? payload!.linkEntries! : [];
  let entries = raw
    .map((row, index) => coerceLink(row, index))
    .filter((row): row is Artist2SongLink => Boolean(row));

  if (entries.length === 0) {
    entries = migrateFlatLinks(payload?.links);
  }

  // At most one Song Pages system row.
  const stubs = entries.filter((e) => e.kind === 'song_pages');
  const rest = entries.filter((e) => e.kind !== 'song_pages');
  const stub = stubs[0] ?? createSongPagesStub(0);
  return sortLinks([stub, ...rest]);
}

/** Upsert a streaming provider URL (used by Suno import). */
export function upsertStreamingLink(
  entries: Artist2SongLink[],
  providerId: string,
  url: string,
): Artist2SongLink[] {
  const normalized = normalizeSongLinks({ linkEntries: entries });
  const trimmed = url.trim();
  if (!trimmed) return normalized;
  const existingIdx = normalized.findIndex(
    (e) => e.kind === 'streaming' && e.providerId === providerId,
  );
  if (existingIdx >= 0) {
    const next = [...normalized];
    next[existingIdx] = { ...next[existingIdx], url: trimmed, visibility: 'public' };
    return next;
  }
  const maxOrder = normalized.reduce((m, e) => Math.max(m, e.sortOrder), 0);
  return sortLinks([
    ...normalized,
    {
      id: newSongLinkId(),
      kind: 'streaming',
      providerId,
      url: trimmed,
      visibility: 'public',
      sortOrder: maxOrder + 10,
    },
  ]);
}

export function linkRowTitle(entry: Artist2SongLink): string {
  if (entry.kind === 'song_pages') return 'Song Pages';
  if (entry.kind === 'web') return entry.label?.trim() || 'Web link';
  const provider = findProviderById(entry.providerId);
  if (provider) return provider.name;
  return entry.label?.trim() || entry.providerId || entry.kind;
}

export function kindLabel(kind: Artist2SongLinkKind): string {
  switch (kind) {
    case 'web':
      return 'Web';
    case 'song_pages':
      return 'Song Pages';
    case 'streaming':
      return 'Streaming';
    case 'social':
      return 'Social';
    case 'distribution':
      return 'Distribution';
    default:
      return kind;
  }
}

export function kindToCapability(kind: Artist2SongLinkKind): ProviderCapability | null {
  if (kind === 'streaming') return 'streaming';
  if (kind === 'social') return 'social';
  if (kind === 'distribution') return 'distribution';
  return null;
}

/**
 * Legacy compile shape — first public URL per known streaming provider.
 * Distribution / private / Song Pages never contribute.
 */
export function compileStreamLinksFromEntries(entries: Artist2SongLink[]): {
  youtube: string;
  spotify: string;
  soundcloud: string;
} {
  const publicStreaming = entries.filter(
    (e) => e.kind === 'streaming' && e.visibility === 'public' && Boolean(e.url?.trim()),
  );

  const first = (providerId: string): string => {
    const hit = publicStreaming.find((e) => e.providerId === providerId);
    return hit?.url?.trim() || '';
  };

  return {
    youtube: first('youtube'),
    spotify: first('spotify'),
    soundcloud: first('soundcloud'),
  };
}

/** Convenience for compile from a full song payload. */
export function compileStreamLinksFromPayload(payload: Artist2SongPayload): {
  youtube: string;
  spotify: string;
  soundcloud: string;
} {
  return compileStreamLinksFromEntries(normalizeSongLinks(payload));
}
