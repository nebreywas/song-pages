/**
 * SoundCloud feature surface for renderer + shared code.
 */
import {
  SOUNDCLOUD_MANIFEST_PREFIX,
  SOUNDCLOUD_PAGE_PREFIX,
  SOUNDCLOUD_PLAYBACK_SCOPE,
  SOUNDCLOUD_TRACK_ID_RE,
} from '../providers/soundcloud/constants.ts';
import {
  canonicalizeSoundcloudInput,
  type SoundcloudCanonicalRef,
} from '../providers/soundcloud/canonicalize.ts';
import { soundcloudWidgetUrl } from '../providers/soundcloud/metadata.ts';

export {
  SOUNDCLOUD_PLAYBACK_SCOPE,
  SOUNDCLOUD_PAGE_PREFIX,
  SOUNDCLOUD_MANIFEST_PREFIX,
};

export type { SoundcloudCanonicalRef };

export function soundcloudShareUrl(permalink: string): string {
  return permalink;
}

export function soundcloudPageUrl(trackId: string): string {
  return `${SOUNDCLOUD_PAGE_PREFIX}${trackId}`;
}

export function soundcloudManifestUrl(trackId: string): string {
  return `${SOUNDCLOUD_MANIFEST_PREFIX}${trackId}`;
}

export { soundcloudWidgetUrl };

export function isSoundcloudSnapshot(pageUrl?: string | null): boolean {
  return String(pageUrl ?? '').startsWith(SOUNDCLOUD_PAGE_PREFIX);
}

export function isSoundcloudSong(song: {
  playback_scope?: string | null;
  page_url?: string | null;
}): boolean {
  return song.playback_scope === SOUNDCLOUD_PLAYBACK_SCOPE || isSoundcloudSnapshot(song.page_url);
}

/** VC state payload uses camelCase — same rule as {@link isSoundcloudSong}. */
export function isVcSoundcloudSong(song: {
  playbackScope?: string | null;
  soundcloudPermalink?: string | null;
} | null | undefined): boolean {
  if (!song) return false;
  return song.playbackScope === SOUNDCLOUD_PLAYBACK_SCOPE || Boolean(song.soundcloudPermalink);
}

export function soundcloudTrackIdFromSong(song: {
  external_id?: string | null;
  page_url?: string | null;
}): string | null {
  if (song.external_id && SOUNDCLOUD_TRACK_ID_RE.test(song.external_id)) return song.external_id;
  if (isSoundcloudSnapshot(song.page_url)) {
    const id = song.page_url!.slice(SOUNDCLOUD_PAGE_PREFIX.length);
    return SOUNDCLOUD_TRACK_ID_RE.test(id) ? id : null;
  }
  return null;
}

export function soundcloudPermalinkFromSong(song: {
  playback_url?: string | null;
  external_id?: string | null;
}): string | null {
  const url = String(song.playback_url ?? '').trim();
  if (url.includes('soundcloud.com/')) return url.split('?')[0] ?? url;
  return null;
}

export function parseSoundcloudManifestTrackId(url: string): string | null {
  if (!url.startsWith(SOUNDCLOUD_MANIFEST_PREFIX)) return null;
  const id = url.slice(SOUNDCLOUD_MANIFEST_PREFIX.length);
  return SOUNDCLOUD_TRACK_ID_RE.test(id) ? id : null;
}

export { canonicalizeSoundcloudInput, validateSoundcloudInput } from '../providers/soundcloud/canonicalize.ts';
