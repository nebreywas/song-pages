import type { MetadataProvenance, MetadataSource } from '../types.ts';
import type { YoutubeCanonicalRef } from './canonicalize.ts';
import { YOUTUBE_VIDEO_ID_RE } from './constants.ts';

/** Metadata we can attach to a playlist row for one YouTube video. */
export type YoutubeWorkMetadata = {
  videoId: string;
  title: string | null;
  channelName: string | null;
  channelUrl: string | null;
  thumbnailUrl: string;
  durationSeconds: number | null;
  provenance: MetadataProvenance;
};

/** Shape returned by YouTube's public oEmbed endpoint (no API key). */
export type YoutubeOEmbedResponse = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  html?: string;
  width?: number;
  height?: number;
  type?: string;
  provider_name?: string;
  version?: string;
};

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Thumbnail URL is derivable from video id without a network call. */
export function deriveThumbnailMetadata(videoId: string): Pick<YoutubeWorkMetadata, 'thumbnailUrl' | 'provenance'> {
  return {
    thumbnailUrl: youtubeThumbnailUrl(videoId),
    provenance: { thumbnailUrl: 'intake-derived' },
  };
}

export function mergeOEmbedMetadata(
  ref: YoutubeCanonicalRef,
  oembed: YoutubeOEmbedResponse | null | undefined,
): YoutubeWorkMetadata {
  const derived = deriveThumbnailMetadata(ref.videoId);
  const title =
    typeof oembed?.title === 'string' && oembed.title.trim() ? oembed.title.trim() : null;
  const channelName =
    typeof oembed?.author_name === 'string' && oembed.author_name.trim()
      ? oembed.author_name.trim()
      : null;
  const channelUrl =
    typeof oembed?.author_url === 'string' && oembed.author_url.trim()
      ? oembed.author_url.trim()
      : null;
  const thumbnailFromOembed =
    typeof oembed?.thumbnail_url === 'string' && oembed.thumbnail_url.trim()
      ? oembed.thumbnail_url.trim()
      : null;

  const provenance: MetadataProvenance = { ...derived.provenance };
  if (title) provenance.title = 'intake-oembed';
  if (channelName) provenance.channelName = 'intake-oembed';
  if (thumbnailFromOembed) provenance.thumbnailUrl = 'intake-oembed';

  return {
    videoId: ref.videoId,
    title,
    channelName,
    channelUrl,
    thumbnailUrl: thumbnailFromOembed ?? derived.thumbnailUrl,
    durationSeconds: null,
    provenance,
  };
}

export function mergePlaybackDurationMetadata(
  metadata: YoutubeWorkMetadata,
  durationSeconds: number,
): YoutubeWorkMetadata {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return metadata;
  return {
    ...metadata,
    durationSeconds: Math.round(durationSeconds),
    provenance: {
      ...metadata.provenance,
      durationSeconds: 'playback-iframe',
    },
  };
}

export function fallbackYoutubeMetadata(ref: YoutubeCanonicalRef): YoutubeWorkMetadata {
  const derived = deriveThumbnailMetadata(ref.videoId);
  return {
    videoId: ref.videoId,
    title: 'YouTube Video',
    channelName: 'YouTube',
    channelUrl: null,
    thumbnailUrl: derived.thumbnailUrl,
    durationSeconds: null,
    provenance: {
      title: 'fallback',
      channelName: 'fallback',
      thumbnailUrl: derived.provenance.thumbnailUrl,
    },
  };
}

export function isValidYoutubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID_RE.test(value);
}

/**
 * Fields available from the IFrame player after `onReady` (renderer only):
 * - getDuration()
 * - getVideoData() → { video_id, title, author } (availability varies by embed / privacy)
 *
 * Not available without API key: view count, description, tags, license, category.
 */
