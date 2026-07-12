import { isSunoDemoSong, sunoShareUrlFromClipUuid } from '../demo/sunoDemoFeature';
import { isYoutubeSong, youtubeWatchUrl, youtubeVideoIdFromSong } from '../youtube/youtubeFeature';

/** Canonical song page URL for sharing — strips cache-bust query params. */
export function shareableSongPageUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    url.searchParams.delete('v');
    url.searchParams.delete('songpagesApp');
    return url.toString();
  } catch {
    return pageUrl.split('?')[0] ?? pageUrl;
  }
}

type ShareableSongRef = {
  page_url: string;
  external_id: string;
  slug: string;
  id: number;
  playback_scope?: string | null;
};

/** Share URL for a library row — Suno imports use suno.com/song/{uuid}. */
export function shareableSongLink(song: ShareableSongRef): string {
  if (isSunoDemoSong(song)) {
    const sunoUrl = sunoShareUrlFromClipUuid(song.external_id) ?? sunoShareUrlFromClipUuid(song.slug);
    if (sunoUrl) return sunoUrl;
  }
  if (isYoutubeSong(song)) {
    const videoId = youtubeVideoIdFromSong(song);
    if (videoId) return youtubeWatchUrl(videoId);
  }
  return shareableSongPageUrl(song.page_url);
}
