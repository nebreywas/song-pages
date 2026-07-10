import { isSunoDemoSong, sunoShareUrlFromClipUuid } from '@shared/demo/sunoDemoFeature';

import type { SongRow } from '../types/app';

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

/** Share URL for a library row — Suno imports use suno.com/song/{uuid}. */
export function shareableSongLink(song: Pick<SongRow, 'page_url' | 'external_id' | 'slug' | 'id' | 'playback_scope'>): string {
  if (isSunoDemoSong(song)) {
    const sunoUrl = sunoShareUrlFromClipUuid(song.external_id) ?? sunoShareUrlFromClipUuid(song.slug);
    if (sunoUrl) return sunoUrl;
  }
  return shareableSongPageUrl(song.page_url);
}
