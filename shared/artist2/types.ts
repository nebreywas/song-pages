/**
 * Artist 2.0 catalog model — stable index fields live in SQLite;
 * evolving detail lives in payload JSON until the schema matures.
 */

import type { Artist2SongRecording } from './songRecordings.ts';
import type { Artist2SongRelation } from './songRelations.ts';

export type { Artist2SongRecording };
export type { Artist2SongRelation, Artist2SongRelationKind } from './songRelations.ts';
export { ARTIST2_SONG_RELATION_KINDS, songRelationLabel } from './songRelations.ts';

export type Artist2CatalogKind = 'song' | 'album' | 'playlist' | 'content';

export type Artist2ContentType = 'image' | 'text' | 'video' | 'audio';

export type Artist2ObjectStatus = 'draft' | 'ready';

/** Album and Playlist — ordered song collections via memberships. */
export function isSongContainerKind(kind: string): kind is 'album' | 'playlist' {
  return kind === 'album' || kind === 'playlist';
}

/** Artwork either belongs to the parent (inline) or references Content. */
export type Artist2ArtworkRef =
  | { mode: 'inline'; path: string | null }
  | { mode: 'contentRef'; contentId: string };

/** Role within a Song’s multi-image Artwork list (Slice D). */
export type Artist2ArtworkRole =
  | 'primary_cover'
  | 'additional_cover'
  | 'additional_image';

/** One image in Song `artworkEntries` (Primary Cover + additional images). */
export type Artist2ArtworkEntry = {
  id: string;
  role: Artist2ArtworkRole;
  source: Artist2ArtworkRef;
  /** Concise descriptor — soft max ~60 chars. */
  description?: string;
  /** Longer commentary — soft max ~500 chars; Markdown later. */
  commentary?: string;
  sortOrder: number;
};

/** Provenance when a Song was seeded from a Suno clip (audio is never auto-imported). */
export type Artist2SunoProvenance = {
  clipId: string;
  shareUrl: string | null;
  modelBadge?: string | null;
  modelName?: string | null;
  creatorHandle?: string | null;
  importedAt: string;
};

export type Artist2SongLinks = {
  youtube?: string;
  spotify?: string;
  soundcloud?: string;
  /** Canonical suno.com/song/{uuid} when known. */
  suno?: string;
};

export type Artist2SongLinkKind =
  | 'web'
  | 'song_pages'
  | 'streaming'
  | 'social'
  | 'distribution';

export type Artist2SongLinkVisibility = 'public' | 'private';

/** System-managed Song Pages destination — URL arrives with real publish later. */
export type Artist2SongPagesPublishState = 'not_published' | 'preview' | 'published';

/** One row in the Song link table (Slice B). */
export type Artist2SongLink = {
  id: string;
  kind: Artist2SongLinkKind;
  /** Registry id for streaming / social / distribution rows. */
  providerId?: string | null;
  /** Required for web; optional override label elsewhere. */
  label?: string;
  url?: string;
  visibility: Artist2SongLinkVisibility;
  sortOrder: number;
  /** Private administrative note — never compiled. */
  notes?: string;
  /** Only for kind === song_pages. */
  songPagesState?: Artist2SongPagesPublishState;
  /** When the link row was added (DD/MM/YYYY). */
  dateAdded?: string;
};

export type Artist2CreationProcessTarget = 'music_mix' | 'vocals';
export type Artist2CreationProcessType =
  | 'performed'
  | 'electronic_daw'
  | 'ai_generation'
  | 'other';
export type Artist2PerformedContext = 'studio' | 'personal' | 'live' | 'field';

export type Artist2AiModelEntry = {
  id: string;
  provider?: string;
  modelName?: string;
  version?: string;
  /** At most one Primary / Final per process cell. */
  primary?: boolean;
  /** Especially useful for AI vocals persona / voice identity. */
  persona?: string;
};

export type Artist2AiPromptEntry = {
  id: string;
  promptType: 'prompt' | 'negative';
  text?: string;
  /** Only normal prompts may be primary. */
  primary?: boolean;
  target: Artist2CreationProcessTarget | 'general';
  sortOrder: number;
};

/** One selected cell in the Creation Process matrix, plus conditional details. */
export type Artist2CreationProcess = {
  id: string;
  target: Artist2CreationProcessTarget;
  processType: Artist2CreationProcessType;
  /**
   * Whether this process cell is shown in the editor and counts as "available"
   * for publishing. The top matrix checkboxes toggle this WITHOUT deleting the
   * cell's data — unchecking hides it and marks it unavailable; data is kept.
   * Absent is treated as `true` for back-compat with pre-flag data.
   */
  available?: boolean;
  performedContexts?: Artist2PerformedContext[];
  performedNotes?: string;
  primaryTool?: string;
  additionalTools?: string[];
  dawCommentary?: string;
  aiModels?: Artist2AiModelEntry[];
  aiCommentary?: string;
  /**
   * AI Vocals only: mirror Music / Mix AI models + commentary.
   * When true, editor shows a compact summary and keeps values synced from music.
   */
  sameAsMusic?: boolean;
  otherProcessName?: string;
  otherCommentary?: string;
};

/** Video / animation role — stub schema for a future multi-entry Video section. */
export type Artist2VideoKind =
  | 'music_video'
  | 'lyric_video'
  | 'visualizer'
  | 'live_performance'
  | 'animated_cover'
  | 'other';

/**
 * One Video / Animation row (stub).
 * Attachment (local file vs Content vs URL) lands when the section is built out.
 */
export type Artist2VideoEntry = {
  id: string;
  kind: Artist2VideoKind;
  /** Optional display label until richer metadata exists. */
  label?: string;
  /** Remote URL when not a local / Content attachment. */
  url?: string;
  /** Local file path when attached directly. */
  filePath?: string | null;
  /** First-class Video Content reference when used. */
  contentId?: string | null;
  description?: string;
  commentary?: string;
  /** At most one featured / primary video later. */
  primary?: boolean;
  sortOrder: number;
};

export type Artist2SongPayload = {
  /**
   * Creation / release date — freeform for now.
   * Accepts a year (`2025`) or a calendar date (`16/07/2025` / `dd/mm/yyyy`).
   */
  creationDate?: string;
  /** @deprecated Prefer creationDate; kept for older payloads and compile year extraction. */
  year?: string;
  /** Optional secondary title / edition line (not a Recording label). */
  subtitle?: string;
  /**
   * Short public presentational line (cards / featured). Soft max ~120 chars.
   * Compile: caption.
   */
  caption?: string;
  /**
   * Primary public description (Markdown). Soft max ~1000 chars.
   * Compile: about.
   */
  about?: string;
  /** URL slug — derived from name unless slugManual. */
  slug?: string;
  /** When true, renaming the Song does not rewrite slug. */
  slugManual?: boolean;
  /** Principal freeform genre tag. */
  primaryGenre?: string;
  /** Extra freeform genre tags (should not duplicate primary). */
  additionalGenres?: string[];
  /**
   * @deprecated Slice A starts fresh — use caption. Not read by compile.
   */
  description?: string;
  /** Private editor notes — never published / never compiled. */
  notes?: string;
  lyrics?: string;
  /** Optional freeform tags (manual). Suno import maps Studio tags into stylePrompt, not here. */
  tags?: string;
  /**
   * Style / inspiration text.
   * @deprecated Slice C maps this into aiPrompts; kept for migration on read.
   */
  stylePrompt?: string;
  bpm?: number | null;
  isInstrumental?: boolean | null;
  /**
   * Structured link table (Slice B). Includes Song Pages stub + streaming/social/web/distribution.
   */
  linkEntries?: Artist2SongLink[];
  /**
   * @deprecated Prefer linkEntries. Migrated on read; writers should not dual-write.
   */
  links?: Artist2SongLinks;
  /** Creation Process matrix cells (Slice C). */
  creationProcesses?: Artist2CreationProcess[];
  /** Associated AI prompts (shown when any AI Generation cell is selected). */
  aiPrompts?: Artist2AiPromptEntry[];
  /** Set when imported from Suno — metadata only; user attaches MP3 separately. */
  suno?: Artist2SunoProvenance | null;
  /**
   * Audio file pointers for this Song — typically format variants of the same cut
   * (mp3 / wav / bitrate), not alternate mixes (those are sister Songs).
   * Exactly one may be `published` for compile / site audio.
   */
  recordings?: Artist2SongRecording[];
  /**
   * @deprecated Prefer `recordings` + published flag.
   * Still mirrored from the published recording for older readers.
   */
  recording?: {
    audioPath?: string | null;
    label?: string;
  };
  /**
   * Multi-image Artwork list (Slice D). Exactly zero or one Primary Cover.
   */
  artworkEntries?: Artist2ArtworkEntry[];
  /**
   * Legacy single cover — mirrored from the Primary Cover for promote / rename /
   * albums-compat. Prefer artworkEntries on Songs.
   */
  artwork?: Artist2ArtworkRef;
  /**
   * Video and Animation entries (stub). Multi-entry shape reserved; editor is
   * placeholder-only until attachment / Content-ref UX ships.
   */
  videoEntries?: Artist2VideoEntry[];
  /**
   * Links to other Songs (sister / remix / …).
   * Different creative mixes belong here — not as extra recordings on this Song.
   */
  relatedSongs?: Artist2SongRelation[];
};

/** Prefer creationDate; fall back to legacy year. */
export function songCreationDate(payload: Artist2SongPayload): string {
  const primary = payload.creationDate?.trim();
  if (primary) return primary;
  return payload.year?.trim() ?? '';
}

/** Best-effort year for compile / display — from creationDate or legacy year. */
export function songYearForCompile(payload: Artist2SongPayload): string {
  const raw = songCreationDate(payload);
  if (!raw) return '';
  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) return yearOnly[1];
  const dmy = raw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) return dmy[3];
  const ymd = raw.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (ymd) return ymd[1];
  const embedded = raw.match(/\b(19|20)\d{2}\b/);
  return embedded ? embedded[0] : '';
}

export type Artist2AlbumPayload = {
  releaseDate?: string;
  description?: string;
  notes?: string;
  artwork?: Artist2ArtworkRef;
};

/** Playlist — same membership model as Album; different editorial fields. */
export type Artist2PlaylistPayload = {
  description?: string;
  curator?: string;
  purpose?: string;
  /** Freeform “last updated” note for the curator (not filesystem mtime). */
  updateDate?: string;
  notes?: string;
  artwork?: Artist2ArtworkRef;
};

export type Artist2ContentPayload = {
  filePath?: string | null;
  /** Main body — markdown by default for text Content. */
  body?: string;
  format?: 'markdown' | 'plain';
  /** Short blurb shown in lists / future Pages embeds. */
  summary?: string;
  notes?: string;
  /** Set when this Content was created via Promote. */
  promotedFrom?: {
    objectId: string;
    field: 'artwork';
  } | null;
};

/** Human label for Content subtypes in the sidebar / delete UI. */
export function artist2ContentTypeLabel(contentType: Artist2ContentType | null | undefined): string {
  switch (contentType) {
    case 'text':
      return 'Text';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'image':
    default:
      return 'Image';
  }
}

export type Artist2ObjectPayload =
  | Artist2SongPayload
  | Artist2AlbumPayload
  | Artist2PlaylistPayload
  | Artist2ContentPayload;

export type Artist2Artist = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  payload: {
    bio?: string;
    links?: Record<string, string>;
    /** URL slug for compile output; defaults to slugified artist name. */
    slug?: string;
    /** Baked into manifest siteRoot when set. */
    deploySiteUrl?: string;
    /**
     * Site presentation stub (Tier 4) — not yet mapped into compile Pages.
     * Home Page Container comes later; these fields reserve the authoring surface.
     */
    site?: {
      homeHeadline?: string;
      homeIntro?: string;
    };
  };
};

export type Artist2CatalogObject = {
  id: string;
  artistId: string;
  kind: Artist2CatalogKind;
  contentType: Artist2ContentType | null;
  name: string;
  status: Artist2ObjectStatus;
  createdAt: string;
  updatedAt: string;
  /** Set when a song or song-container was soft-deleted; active catalog excludes these. */
  deletedAt?: string | null;
  payload: Artist2ObjectPayload;
};

export type Artist2LibraryFilter = 'all' | 'songs' | 'containers' | 'content';

/** One parent relationship removed because the deleted object was referenced elsewhere. */
export type Artist2BrokenReference = {
  refKind: 'containerMembership' | 'artworkRef';
  parentKind: 'album' | 'playlist' | 'song';
  parentId: string;
  parentName: string;
  field: 'tracks' | 'artwork';
  /** Human-readable detail, e.g. track position or field label. */
  detail?: string;
  membershipId?: string;
  memberId?: string;
  memberName?: string;
};

/** Preview shown before confirming a destructive delete. */
export type Artist2DeleteImpact = {
  object: {
    id: string;
    kind: Artist2CatalogKind;
    name: string;
    contentType: Artist2ContentType | null;
  };
  brokenRefs: Artist2BrokenReference[];
  /** Songs and albums are soft-deleted and restorable from the Deleted items modal. */
  willSoftDelete: boolean;
  /** Content is hard-deleted; repair via deletion reports only. */
  willHardDelete: boolean;
};

export type Artist2DeleteResult = {
  ok: boolean;
  deleted: boolean;
  reportId?: string | null;
};

export type Artist2DeletionReport = {
  id: string;
  artistId: string;
  deletedObjectId: string;
  deletedKind: Artist2CatalogKind;
  deletedName: string;
  deletedContentType: Artist2ContentType | null;
  deletedAt: string;
  snapshot: Record<string, unknown>;
  brokenRefs: Artist2BrokenReference[];
  createdAt: string;
  clearedAt: string | null;
};

export type Artist2Membership = {
  id: string;
  containerId: string;
  memberId: string;
  position: number;
  payload: Record<string, unknown>;
};

/** Shared detail for Album / Playlist editors (ordered song memberships). */
export type Artist2ContainerDetail = Artist2CatalogObject & {
  kind: 'album' | 'playlist';
  memberships: Artist2Membership[];
  /** Resolved song rows for the track list UI. */
  tracks: Artist2CatalogObject[];
};

/** @deprecated Prefer Artist2ContainerDetail — kept for existing imports. */
export type Artist2AlbumDetail = Artist2ContainerDetail;

export type Artist2AlbumTrackSummaries = Record<string, Artist2TrackSummary[]>;

export type Artist2TrackSummary = {
  id: string;
  name: string;
};

export type Artist2EditorSelection =
  | { type: 'artist' }
  | { type: 'object'; id: string };

/** Soft incompleteness — never blocks editing; guides richer catalogs over time. */
export type Artist2IncompleteHint = {
  code: string;
  label: string;
};

export function songIncompleteHints(song: Artist2CatalogObject): Artist2IncompleteHint[] {
  if (song.kind !== 'song') return [];
  const payload = song.payload as Artist2SongPayload;
  const hints: Artist2IncompleteHint[] = [];
  const publishedPath =
    payload.recordings?.find((r) => r.published)?.audioPath?.trim() ||
    payload.recordings?.find((r) => r.audioPath?.trim())?.audioPath?.trim() ||
    payload.recording?.audioPath?.trim() ||
    '';
  if (!publishedPath) {
    hints.push({ code: 'no-audio', label: 'No audio yet' });
  }
  // Prefer multi-image primary; fall back to legacy single artwork field.
  const hasEntries = Array.isArray(payload.artworkEntries) && payload.artworkEntries.length > 0;
  if (hasEntries) {
    const primary =
      payload.artworkEntries!.find((e) => e.role === 'primary_cover') ?? payload.artworkEntries![0];
    const src = primary?.source;
    if (
      !src ||
      (src.mode === 'inline' && !src.path) ||
      (src.mode === 'contentRef' && !src.contentId)
    ) {
      hints.push({ code: 'no-artwork', label: 'No artwork yet' });
    }
  } else {
    const art = payload.artwork;
    if (!art || (art.mode === 'inline' && !art.path) || (art.mode === 'contentRef' && !art.contentId)) {
      hints.push({ code: 'no-artwork', label: 'No artwork yet' });
    }
  }
  return hints;
}

export function albumIncompleteHints(
  album: Artist2CatalogObject,
  trackCount: number,
): Artist2IncompleteHint[] {
  if (!isSongContainerKind(album.kind)) return [];
  const hints: Artist2IncompleteHint[] = [];
  if (trackCount < 1) {
    hints.push({ code: 'no-tracks', label: 'No tracks yet' });
  }
  return hints;
}

/** Alias for playlist / album incomplete badges. */
export const containerIncompleteHints = albumIncompleteHints;
