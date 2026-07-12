export const FLOW_PROVIDER_ID = 'flow' as const;

export const FLOW_PLAYBACK_SCOPE = 'flow';
export const FLOW_PAGE_PREFIX = 'songpages-flow:page/';
export const FLOW_MANIFEST_PREFIX = 'songpages-flow:manifest/';

export const FLOW_SONG_PAGE_HOSTS = new Set(['flowmusic.app', 'www.flowmusic.app']);

export const FLOW_PUBLIC_CLIP_HOST = 'storage.googleapis.com';
export const FLOW_PUBLIC_CLIP_PATH_PREFIX = '/producer-app-public/clips/';
export const FLOW_PRIVATE_CLIP_PATH_MARKER = 'producer-app-private';

/** Flow clip ids are standard UUIDs. */
export const FLOW_CLIP_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const FLOW_PUBLIC_SHARE_BASE = 'https://www.flowmusic.app/song/';
