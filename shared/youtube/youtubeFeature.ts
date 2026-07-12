/**
 * YouTube feature surface for renderer + shared code.
 * Intake/canonicalization lives in shared/providers/youtube — this module re-exports
 * stable helpers used by ListenerMode, playlist snapshots, and manifests.
 */
import {
  YOUTUBE_MANIFEST_PREFIX,
  YOUTUBE_PAGE_PREFIX,
  YOUTUBE_PLAYBACK_SCOPE,
  YOUTUBE_VIDEO_ID_RE,
} from '../providers/youtube/constants.ts';
import {
  canonicalizeYoutubeInput,
  type YoutubeCanonicalRef,
} from '../providers/youtube/canonicalize.ts';
import { youtubeThumbnailUrl } from '../providers/youtube/metadata.ts';

export {
  YOUTUBE_PLAYBACK_SCOPE,
  YOUTUBE_PAGE_PREFIX,
  YOUTUBE_MANIFEST_PREFIX,
};

export type { YoutubeCanonicalRef };

/** Parse a YouTube watch URL, short link, embed path, or bare 11-char video id. */
export function parseYoutubeVideoId(input: string): string | null {
  const result = canonicalizeYoutubeInput(input);
  return result.ok ? result.ref.videoId : null;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubePageUrl(videoId: string): string {
  return `${YOUTUBE_PAGE_PREFIX}${videoId}`;
}

export function youtubeManifestUrl(videoId: string): string {
  return `${YOUTUBE_MANIFEST_PREFIX}${videoId}`;
}

export { youtubeThumbnailUrl };

export function isYoutubeSnapshot(pageUrl?: string | null): boolean {
  return String(pageUrl ?? '').startsWith(YOUTUBE_PAGE_PREFIX);
}

export function isYoutubeSong(song: {
  playback_scope?: string | null;
  page_url?: string | null;
}): boolean {
  return song.playback_scope === YOUTUBE_PLAYBACK_SCOPE || isYoutubeSnapshot(song.page_url);
}

/** VC state payload uses camelCase — same rule as {@link isYoutubeSong}. */
export function isVcYoutubeSong(song: {
  playbackScope?: string | null;
  youtubeVideoId?: string | null;
} | null | undefined): boolean {
  if (!song) return false;
  return song.playbackScope === YOUTUBE_PLAYBACK_SCOPE || Boolean(song.youtubeVideoId);
}

export function youtubeVideoIdFromSong(song: {
  external_id?: string | null;
  slug?: string | null;
  playback_url?: string | null;
  page_url?: string | null;
}): string | null {
  if (song.external_id && YOUTUBE_VIDEO_ID_RE.test(song.external_id)) return song.external_id;
  if (isYoutubeSnapshot(song.page_url)) {
    const id = song.page_url!.slice(YOUTUBE_PAGE_PREFIX.length);
    return YOUTUBE_VIDEO_ID_RE.test(id) ? id : null;
  }
  return parseYoutubeVideoId(song.playback_url ?? '');
}

export function parseYoutubeManifestVideoId(url: string): string | null {
  if (!url.startsWith(YOUTUBE_MANIFEST_PREFIX)) return null;
  const id = url.slice(YOUTUBE_MANIFEST_PREFIX.length);
  return YOUTUBE_VIDEO_ID_RE.test(id) ? id : null;
}

export { canonicalizeYoutubeInput, validateYoutubeInput } from '../providers/youtube/canonicalize.ts';
