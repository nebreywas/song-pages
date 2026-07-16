/**
 * Normalized Studio clip metadata for Suno playlist snapshots and song pages.
 * Keep in sync with shared/providers/suno/clipMetadata.ts
 */

const SUNO_PROVIDER_ID = 'suno';
const SUNO_CLIP_METADATA_SCHEMA_VERSION = 1;

function asNonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value) {
  if (typeof value === 'boolean') return value;
  return null;
}

function splitSunoTags(tags) {
  if (!String(tags || '').trim()) return [];
  const seen = new Set();
  const list = [];
  for (const part of String(tags).split(/[,|]/)) {
    const tag = part.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(tag);
  }
  return list;
}

function yearFromCreatedAt(raw) {
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

function emptyMetadata(clipId) {
  return {
    schemaVersion: SUNO_CLIP_METADATA_SCHEMA_VERSION,
    provider: SUNO_PROVIDER_ID,
    clipId: clipId || '',
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
    playCount: null,
    upvoteCount: null,
    commentCount: null,
    isInstrumental: null,
    videoUrl: null,
    videoCoverUrl: null,
    bpm: null,
  };
}

/**
 * Pull displayable Studio fields into a stable schema.
 * Lyrics stay on playlist `lyrics` / manifest lyrics — not duplicated here.
 */
function metadataFromSunoClip(clip) {
  const clipId = asNonEmptyString(clip?.id) || '';
  const base = emptyMetadata(clipId);
  if (!clip || typeof clip !== 'object') return base;

  const meta = clip.metadata && typeof clip.metadata === 'object' ? clip.metadata : {};

  const createdAt = asNonEmptyString(clip.created_at) || asNonEmptyString(clip.createdAt) || null;
  const tags = asNonEmptyString(meta.tags) || asNonEmptyString(clip.tags) || '';
  const stylePrompt =
    asNonEmptyString(meta.gpt_description_prompt) || asNonEmptyString(clip.gpt_description_prompt) || '';

  const modelBadge =
    asNonEmptyString(clip.major_model_version) || asNonEmptyString(clip.majorModelVersion) || null;
  const modelName = asNonEmptyString(clip.model_name) || asNonEmptyString(clip.modelName) || null;

  const creatorHandle = asNonEmptyString(clip.handle) || asNonEmptyString(clip.user_handle) || null;
  const creatorDisplayName =
    asNonEmptyString(clip.display_name) ||
    asNonEmptyString(clip.user_display_name) ||
    asNonEmptyString(meta.artist) ||
    null;
  const creatorAvatarUrl =
    asNonEmptyString(clip.avatar_image_url) || asNonEmptyString(clip.avatar_url) || null;

  const bpm =
    asFiniteNumber(meta.avg_bpm) || asFiniteNumber(meta.bpm) || asFiniteNumber(clip.avg_bpm) || null;

  const isInstrumental =
    asBoolean(meta.make_instrumental) ?? asBoolean(clip.make_instrumental) ?? null;

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
    playCount: asFiniteNumber(clip.play_count) ?? asFiniteNumber(clip.playCount),
    upvoteCount: asFiniteNumber(clip.upvote_count) ?? asFiniteNumber(clip.upvoteCount),
    commentCount: asFiniteNumber(clip.comment_count) ?? asFiniteNumber(clip.commentCount),
    isInstrumental,
    videoUrl: asNonEmptyString(clip.video_url) || asNonEmptyString(clip.videoUrl),
    // Short animated / uploaded cover loop — distinct from the lyric `video_url` MP4.
    videoCoverUrl:
      asNonEmptyString(clip.video_cover_url) || asNonEmptyString(clip.videoCoverUrl),
    bpm,
  };
}

function serializeSunoProviderMetadata(metadata) {
  return JSON.stringify(metadata);
}

function parseSunoProviderMetadata(raw) {
  if (raw == null || raw === '') return null;

  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object') return null;

  if (value.schemaVersion === SUNO_CLIP_METADATA_SCHEMA_VERSION && value.provider === SUNO_PROVIDER_ID) {
    const tags = typeof value.tags === 'string' ? value.tags : '';
    return {
      ...emptyMetadata(asNonEmptyString(value.clipId) || ''),
      ...value,
      schemaVersion: SUNO_CLIP_METADATA_SCHEMA_VERSION,
      provider: SUNO_PROVIDER_ID,
      clipId: asNonEmptyString(value.clipId) || '',
      createdAt: asNonEmptyString(value.createdAt),
      year: asNonEmptyString(value.year) || yearFromCreatedAt(value.createdAt),
      tags,
      tagList: Array.isArray(value.tagList)
        ? value.tagList.filter((t) => typeof t === 'string' && t.trim())
        : splitSunoTags(tags),
      stylePrompt: typeof value.stylePrompt === 'string' ? value.stylePrompt : '',
      modelBadge: asNonEmptyString(value.modelBadge),
      modelName: asNonEmptyString(value.modelName),
      creatorHandle: asNonEmptyString(value.creatorHandle),
      creatorDisplayName: asNonEmptyString(value.creatorDisplayName),
      creatorAvatarUrl: asNonEmptyString(value.creatorAvatarUrl),
      explicit: asBoolean(value.explicit),
      playCount: asFiniteNumber(value.playCount),
      upvoteCount: asFiniteNumber(value.upvoteCount),
      commentCount: asFiniteNumber(value.commentCount),
      isInstrumental: asBoolean(value.isInstrumental),
      videoUrl: asNonEmptyString(value.videoUrl),
      videoCoverUrl: asNonEmptyString(value.videoCoverUrl),
      bpm: asFiniteNumber(value.bpm),
    };
  }

  if (asNonEmptyString(value.id) || value.metadata) {
    return metadataFromSunoClip(value);
  }

  return null;
}

module.exports = {
  SUNO_CLIP_METADATA_SCHEMA_VERSION,
  splitSunoTags,
  yearFromCreatedAt,
  metadataFromSunoClip,
  serializeSunoProviderMetadata,
  parseSunoProviderMetadata,
};
