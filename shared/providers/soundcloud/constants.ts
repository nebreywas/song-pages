export const SOUNDCLOUD_PROVIDER_ID = 'soundcloud' as const;

export const SOUNDCLOUD_PLAYBACK_SCOPE = 'soundcloud';
export const SOUNDCLOUD_PAGE_PREFIX = 'songpages-soundcloud:track/';
export const SOUNDCLOUD_MANIFEST_PREFIX = 'songpages-soundcloud:manifest/';

/** Numeric track id from api.soundcloud.com/tracks/{id}. */
export const SOUNDCLOUD_TRACK_ID_RE = /^\d+$/;

export const SOUNDCLOUD_OEMBED_HOST = 'soundcloud.com';
export const SOUNDCLOUD_WIDGET_HOST = 'w.soundcloud.com';

/** Path segments that are never single-track permalinks. */
export const SOUNDCLOUD_RESERVED_SEGMENTS = new Set([
  'sets',
  'albums',
  'likes',
  'reposts',
  'followers',
  'following',
  'comments',
  'popular-tracks',
  'tracks',
  'groups',
  'stations',
]);
