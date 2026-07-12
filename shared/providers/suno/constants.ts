export const SUNO_PROVIDER_ID = 'suno' as const;

export const SUNO_CLIP_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SUNO_SHARE_HOSTS = new Set(['suno.com', 'www.suno.com']);

/** Short share tokens from suno.com/s/{token} — resolved to clip UUID in main process. */
export const SUNO_SHORT_SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{8,32}$/;
