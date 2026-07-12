export const YOUTUBE_PROVIDER_ID = 'youtube' as const;

export const YOUTUBE_PLAYBACK_SCOPE = 'youtube';
export const YOUTUBE_PAGE_PREFIX = 'songpages-youtube:watch/';
export const YOUTUBE_MANIFEST_PREFIX = 'songpages-youtube:manifest/';

/** YouTube video ids are always 11 characters from this alphabet. */
export const YOUTUBE_VIDEO_ID_RE = /^[\w-]{11}$/;
