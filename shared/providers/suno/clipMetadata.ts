/**
 * Normalized Studio clip metadata for Suno playlist snapshots and song pages.
 * Keep electron/listener/sunoDemo/clipMetadata.js in sync.
 */

import { SUNO_PROVIDER_ID } from './constants.ts';

export const SUNO_CLIP_METADATA_SCHEMA_VERSION = 1 as const;

/** Display-ready fields we can reliably extract from a Studio `/clip` payload. */
export type SunoClipProviderMetadata = {
  schemaVersion: typeof SUNO_CLIP_METADATA_SCHEMA_VERSION;
  provider: typeof SUNO_PROVIDER_ID;
  clipId: string;
  /** ISO timestamp from Studio `created_at`. */
  createdAt: string | null;
  /** YYYY from createdAt — also mirrored to playlist `year`. */
  year: string | null;
  /** Raw style-tags string (comma-separated). */
  tags: string;
  /** Tags split for chip UI. */
  tagList: string[];
  /** Inspiration / style description (`gpt_description_prompt`), not lyrics. */
  stylePrompt: string;
  /** Public model badge (`major_model_version`), e.g. `v5`. */
  modelBadge: string | null;
  /** Internal model name when present, e.g. `chirp-v4-…`. */
  modelName: string | null;
  creatorHandle: string | null;
  creatorDisplayName: string | null;
  creatorAvatarUrl: string | null;
  explicit: boolean | null;
  /**
   * Studio-reported play count for this clip on Suno.
   * Provider-imported only — never map into Song Pages History / playStats.
   */
  sunoPlayCount: number | null;
  /**
   * Studio-reported upvote/like count on Suno.
   * Provider-imported only — never map into Song Pages likes.
   */
  sunoLikeCount: number | null;
  commentCount: number | null;
  isInstrumental: boolean | null;
  /** Full-song lyric / "Made with Suno" MP4 (`video_url`). */
  videoUrl: string | null;
  /** Short animated / uploaded cover loop for song cards (`video_cover_url`). */
  videoCoverUrl: string | null;
  /** Average BPM when Studio reports it. */
  bpm: number | null;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

/** Split Studio tags (`a, b ,c`) into unique non-empty chips. */
export function splitSunoTags(tags: string): string[] {
  if (!tags.trim()) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of tags.split(/[,|]/)) {
    const tag = part.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(tag);
  }
  return list;
}

export function yearFromCreatedAt(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const asString = String(raw).trim();
  const prefix = asString.match(/^(\d{4})\b/);
  if (prefix) return prefix[1];
  const parsed = new Date(asString);
  if (!Number.isNaN(parsed.getTime())) {
    return String(parsed.getUTCFullYear());
  }
  return null;
}

/** Long form for song-page dates, e.g. `Jun 26, 2026`. */
export function formatSunoCreatedDate(createdAt: string | null | undefined): string | null {
  const raw = asNonEmptyString(createdAt);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function emptyMetadata(clipId: string): SunoClipProviderMetadata {
  return {
    schemaVersion: SUNO_CLIP_METADATA_SCHEMA_VERSION,
    provider: SUNO_PROVIDER_ID,
    clipId,
    createdAt: null,
    year: null,
    tags: '',
    tagList: [],
    stylePrompt: '',
    modelBadge: null,
    modelName: null,
    creatorHandle: null,
    creatorDisplayName: null,
    creatorAvatarUrl: null,
    explicit: null,
    sunoPlayCount: null,
    sunoLikeCount: null,
    commentCount: null,
    isInstrumental: null,
    videoUrl: null,
    videoCoverUrl: null,
    bpm: null,
  };
}

/**
 * Pull displayable Studio fields into a stable schema.
 * Omits raw lyrics/prompt text (those stay on playlist `lyrics` / manifest lyrics).
 */
export function metadataFromSunoClip(clip: Record<string, unknown> | null | undefined): SunoClipProviderMetadata {
  const clipId = asNonEmptyString(clip?.id) ?? '';
  const base = emptyMetadata(clipId);
  if (!clip || typeof clip !== 'object') return base;

  const meta =
    clip.metadata && typeof clip.metadata === 'object'
      ? (clip.metadata as Record<string, unknown>)
      : {};

  const createdAt =
    asNonEmptyString(clip.created_at) ?? asNonEmptyString(clip.createdAt) ?? null;
  const tags =
    asNonEmptyString(meta.tags) ??
    asNonEmptyString(clip.tags) ??
    '';
  const stylePrompt =
    asNonEmptyString(meta.gpt_description_prompt) ??
    asNonEmptyString(clip.gpt_description_prompt) ??
    '';

  const modelBadge =
    asNonEmptyString(clip.major_model_version) ??
    asNonEmptyString(clip.majorModelVersion) ??
    null;
  const modelName =
    asNonEmptyString(clip.model_name) ?? asNonEmptyString(clip.modelName) ?? null;

  const creatorHandle =
    asNonEmptyString(clip.handle) ??
    asNonEmptyString(clip.user_handle) ??
    null;
  const creatorDisplayName =
    asNonEmptyString(clip.display_name) ??
    asNonEmptyString(clip.user_display_name) ??
    asNonEmptyString(meta.artist) ??
    null;
  const creatorAvatarUrl =
    asNonEmptyString(clip.avatar_image_url) ??
    asNonEmptyString(clip.avatar_url) ??
    null;

  const bpm =
    asFiniteNumber(meta.avg_bpm) ??
    asFiniteNumber(meta.bpm) ??
    asFiniteNumber(clip.avg_bpm) ??
    null;

  const isInstrumental =
    asBoolean(meta.make_instrumental) ??
    asBoolean(clip.make_instrumental) ??
    null;

  return {
    ...base,
    createdAt,
    year: yearFromCreatedAt(createdAt),
    tags,
    tagList: splitSunoTags(tags),
    stylePrompt,
    modelBadge,
    modelName,
    creatorHandle,
    creatorDisplayName,
    creatorAvatarUrl,
    explicit: asBoolean(clip.is_explicit) ?? asBoolean(clip.explicit) ?? null,
    // Rename at the boundary so Studio counters never look like Song Pages stats.
    sunoPlayCount: asFiniteNumber(clip.play_count) ?? asFiniteNumber(clip.playCount),
    sunoLikeCount: asFiniteNumber(clip.upvote_count) ?? asFiniteNumber(clip.upvoteCount),
    commentCount: asFiniteNumber(clip.comment_count) ?? asFiniteNumber(clip.commentCount),
    isInstrumental,
    videoUrl: asNonEmptyString(clip.video_url) ?? asNonEmptyString(clip.videoUrl),
    videoCoverUrl:
      asNonEmptyString(clip.video_cover_url) ?? asNonEmptyString(clip.videoCoverUrl),
    bpm,
  };
}

export function serializeSunoProviderMetadata(metadata: SunoClipProviderMetadata): string {
  return JSON.stringify(metadata);
}

/** Recover stored snapshot JSON (or a raw clip) for the renderer. */
export function parseSunoProviderMetadata(raw: unknown): SunoClipProviderMetadata | null {
  if (raw == null || raw === '') return null;

  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;

  // Already normalized (schemaVersion present).
  if (obj.schemaVersion === SUNO_CLIP_METADATA_SCHEMA_VERSION && obj.provider === SUNO_PROVIDER_ID) {
    const tags = typeof obj.tags === 'string' ? obj.tags : '';
    return {
      ...emptyMetadata(asNonEmptyString(obj.clipId) ?? ''),
      schemaVersion: SUNO_CLIP_METADATA_SCHEMA_VERSION,
      provider: SUNO_PROVIDER_ID,
      clipId: asNonEmptyString(obj.clipId) ?? '',
      createdAt: asNonEmptyString(obj.createdAt),
      year: asNonEmptyString(obj.year) ?? yearFromCreatedAt(obj.createdAt),
      tags,
      tagList: Array.isArray(obj.tagList)
        ? obj.tagList.filter((t): t is string => typeof t === 'string' && Boolean(t.trim()))
        : splitSunoTags(tags),
      stylePrompt: typeof obj.stylePrompt === 'string' ? obj.stylePrompt : '',
      modelBadge: asNonEmptyString(obj.modelBadge),
      modelName: asNonEmptyString(obj.modelName),
      creatorHandle: asNonEmptyString(obj.creatorHandle),
      creatorDisplayName: asNonEmptyString(obj.creatorDisplayName),
      creatorAvatarUrl: asNonEmptyString(obj.creatorAvatarUrl),
      explicit: asBoolean(obj.explicit),
      // Accept renamed keys plus legacy playCount/upvoteCount from older snapshots.
      sunoPlayCount: asFiniteNumber(obj.sunoPlayCount) ?? asFiniteNumber(obj.playCount),
      sunoLikeCount: asFiniteNumber(obj.sunoLikeCount) ?? asFiniteNumber(obj.upvoteCount),
      commentCount: asFiniteNumber(obj.commentCount),
      isInstrumental: asBoolean(obj.isInstrumental),
      videoUrl: asNonEmptyString(obj.videoUrl),
      videoCoverUrl: asNonEmptyString(obj.videoCoverUrl),
      bpm: asFiniteNumber(obj.bpm),
    };
  }

  // Raw Studio clip shape — normalize on the fly.
  if (asNonEmptyString(obj.id) || obj.metadata) {
    return metadataFromSunoClip(obj);
  }

  return null;
}
