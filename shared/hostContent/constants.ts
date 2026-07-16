/** Host Content — limits and persistence keys. */

export const HOST_CONTENT_SETTINGS_KEY = 'vc.hostContent';

export const HOST_CONTENT_NAME_MAX_LEN = 24;
export const HOST_CONTENT_TITLE_TEXT_MAX_LEN = 36;
export const HOST_CONTENT_AREA_TEXT_MAX_LEN = 1000;

export const HOST_GRAPHIC_MAX_BYTES = 5 * 1024 * 1024;
export const HOST_VIDEO_MAX_BYTES = 12 * 1024 * 1024;
export const HOST_MEDIA_MAX_PX = 2560;

export const HOST_GRAPHIC_EXTENSIONS = ['png', 'jpg', 'jpeg', 'heic', 'webp', 'gif'] as const;
export const HOST_VIDEO_EXTENSIONS = ['mp4'] as const;

/** Pre-listed fallback slot ids — not deletable from inventory. */
export const HOST_FALLBACK_SLOT_IDS = [
  'cover',
  'video-cover',
  'lyrics-video',
  'lyrics',
  'about-song',
  'artist-name',
  'artist-image',
  'song-title',
  'main-genre',
  'additional-genres',
] as const;
