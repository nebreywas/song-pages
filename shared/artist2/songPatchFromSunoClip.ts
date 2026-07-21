/**
 * Pure mapping: Suno Studio clip → Artist 2.0 song field patch.
 * Never includes audio or video URLs — only display metadata + static cover URL hint.
 */

import { metadataFromSunoClip } from '../providers/suno/clipMetadata.ts';
import { applySunoToCreationProcess } from './songCreationProcess.ts';
import { slugifySongName } from './songSlug.ts';
import { createSongPagesStub, upsertStreamingLink } from './songLinks.ts';
import type { Artist2SongPayload } from './types.ts';

export type Artist2SunoImportPatch = {
  name: string;
  payload: Partial<Artist2SongPayload>;
  /** Remote static cover URL to download once — never video_cover_url / video_url. */
  staticCoverUrl: string | null;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Lyrics only — do not fall back to style prompt. */
export function lyricsFromSunoClip(clip: Record<string, unknown> | null | undefined): string {
  if (!clip || typeof clip !== 'object') return '';
  const meta =
    clip.metadata && typeof clip.metadata === 'object'
      ? (clip.metadata as Record<string, unknown>)
      : {};
  return (
    asNonEmptyString(meta.prompt) ??
    asNonEmptyString(clip.prompt) ??
    asNonEmptyString(clip.lyric) ??
    asNonEmptyString(clip.lyrics) ??
    ''
  );
}

/** Prefer API still image fields; never animated cover / lyric video. */
export function staticCoverUrlFromSunoClip(
  clip: Record<string, unknown> | null | undefined,
  clipId: string,
): string | null {
  if (!clip || typeof clip !== 'object') {
    return clipId ? `https://cdn2.suno.ai/image_large_${clipId}.jpeg` : null;
  }
  const fromApi =
    asNonEmptyString(clip.image_large_url) ??
    asNonEmptyString(clip.image_url) ??
    asNonEmptyString(clip.imageUrl);
  if (fromApi) return fromApi;
  const id = asNonEmptyString(clip.id) ?? clipId;
  return id ? `https://cdn2.suno.ai/image_large_${id}.jpeg` : null;
}

/**
 * Creation date for the catalog — prefer a calendar day (dd/mm/yyyy UTC),
 * else a year-only string when that is all Studio gives us.
 */
export function creationDateFromSunoClip(
  createdAt: string | null | undefined,
  yearFallback: string | null | undefined,
): string | undefined {
  const raw = asNonEmptyString(createdAt);
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const dd = String(parsed.getUTCDate()).padStart(2, '0');
      const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = String(parsed.getUTCFullYear());
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return asNonEmptyString(yearFallback) ?? undefined;
}

export function songPatchFromSunoClip(
  clip: Record<string, unknown>,
  options: { importedAt?: string } = {},
): Artist2SunoImportPatch {
  const meta = metadataFromSunoClip(clip);
  const clipId = meta.clipId || asNonEmptyString(clip.id) || '';
  const title =
    asNonEmptyString(clip.title) ??
    asNonEmptyString(clip.display_name) ??
    'Untitled Song';
  const shareUrl = clipId ? `https://suno.com/song/${clipId}` : null;
  const importedAt = options.importedAt ?? new Date().toISOString();

  // Studio `tags` (genre/style chips) → AI prompt via Creation Process (Slice C).
  // Longer gpt_description_prompt → about (public description).
  const styleFromTags = meta.tags.trim() || undefined;
  const longStyle = meta.stylePrompt.trim() || undefined;

  // Slice B: Suno share URL lands as a streaming row, not flat links.suno.
  let linkEntries = [createSongPagesStub(0)];
  if (shareUrl) {
    linkEntries = upsertStreamingLink(linkEntries, 'suno', shareUrl);
  }

  const creation = applySunoToCreationProcess({
    stylePrompt: styleFromTags,
    modelName: meta.modelName,
    modelBadge: meta.modelBadge,
  });

  return {
    name: title,
    payload: {
      creationDate: creationDateFromSunoClip(meta.createdAt, meta.year),
      lyrics: lyricsFromSunoClip(clip),
      about: longStyle,
      slug: slugifySongName(title),
      slugManual: false,
      bpm: meta.bpm,
      isInstrumental: meta.isInstrumental,
      // Studio’s explicit flag — author can clear/change it in Song Editor.
      explicit: meta.explicit,
      linkEntries,
      creationProcesses: creation.creationProcesses,
      aiPrompts: creation.aiPrompts,
      suno: {
        clipId,
        shareUrl,
        modelBadge: meta.modelBadge,
        modelName: meta.modelName,
        creatorHandle: meta.creatorHandle,
        importedAt,
      },
      // Explicit: do not touch recording — user attaches local MP3.
    },
    staticCoverUrl: staticCoverUrlFromSunoClip(clip, clipId),
  };
}
